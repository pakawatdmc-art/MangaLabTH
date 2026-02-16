import os
import re
import zipfile
from io import BytesIO

from django import forms
from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.models import Group, User
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Count
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline

from .models import Manga, Chapter, Page

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'}


def natural_sort_key(s):
    """Sort filenames naturally: page1, page2, page10 (not page1, page10, page2)."""
    return [
        int(part) if part.isdigit() else part.lower()
        for part in re.split(r'(\d+)', s)
    ]


# ---------------------------------------------------------------------------
# Inline — manual page editing (still available)
# ---------------------------------------------------------------------------
class PageInline(TabularInline):
    model = Page
    extra = 1
    fields = ('number', 'image')
    verbose_name = 'หน้า'
    verbose_name_plural = 'รายการหน้า (แก้ไขทีละรูปได้)'


# ---------------------------------------------------------------------------
# Chapter form — adds a ZIP file field
# ---------------------------------------------------------------------------
class ChapterForm(forms.ModelForm):
    zip_file = forms.FileField(
        required=False,
        label="อัปโหลดไฟล์ ZIP ของรูปหน้า",
        help_text="อัปโหลด .zip ที่มีไฟล์รูปภาพ ระบบจะเรียงตามชื่อไฟล์ให้อัตโนมัติ (เช่น 001.jpg, 002.jpg)",
    )
    replace_pages = forms.BooleanField(
        required=False,
        label="ลบหน้าทั้งหมดก่อนนำเข้า",
        help_text="เหมาะกับกรณีอัปโหลดใหม่ทั้งตอน เพื่อลดความซ้ำซ้อน",
    )

    class Meta:
        model = Chapter
        fields = '__all__'

    def clean_zip_file(self):
        zf = self.cleaned_data.get('zip_file')
        if zf and not zf.name.lower().endswith('.zip'):
            raise forms.ValidationError("รองรับเฉพาะไฟล์ .zip เท่านั้น")
        return zf


for model in (User, Group):
    try:
        admin.site.unregister(model)
    except admin.sites.NotRegistered:
        pass


# ---------------------------------------------------------------------------
# Manga Admin
# ---------------------------------------------------------------------------
@admin.register(Manga)
class MangaAdmin(ModelAdmin):
    list_display = ('cover_preview', 'title', 'category', 'status_badge', 'chapter_count', 'created_at')
    search_fields = ('title',)
    list_filter = ('category', 'status', 'created_at')
    list_display_links = ('title',)
    ordering = ('-created_at',)
    list_per_page = 30
    search_help_text = 'ค้นหาจากชื่อเรื่อง'
    actions = ('mark_as_ongoing', 'mark_as_completed', 'mark_as_hiatus')
    readonly_fields = ('cover_preview', 'created_at')

    fieldsets = (
        ('ข้อมูลหลัก', {
            'fields': ('title', 'description', 'cover', 'cover_preview'),
        }),
        ('การจัดหมวดหมู่', {
            'fields': ('category', 'status'),
        }),
        ('ข้อมูลระบบ', {
            'fields': ('created_at',),
        }),
    )

    @admin.display(description='ภาพปก')
    def cover_preview(self, obj):
        if not obj.pk or not obj.cover:
            return '-'
        return format_html(
            '<img src="{}" style="height:56px;width:40px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,255,255,.12);"/>',
            obj.cover.url,
        )

    @admin.display(description='สถานะ')
    def status_badge(self, obj):
        color = {
            'ongoing': '#16a34a',
            'completed': '#64748b',
            'hiatus': '#f59e0b',
        }.get(obj.status, '#64748b')
        return format_html(
            '<span style="padding:2px 8px;border-radius:999px;background:{}22;color:{};font-size:12px;">{}</span>',
            color,
            color,
            obj.get_status_display(),
        )

    @admin.display(description='จำนวนตอน')
    def chapter_count(self, obj):
        return getattr(obj, 'chapter_count_value', 0)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(chapter_count_value=Count('chapters'))

    @admin.action(description='เปลี่ยนสถานะเป็น "กำลังอัปเดต"')
    def mark_as_ongoing(self, request, queryset):
        updated = queryset.update(status=Manga.PublishStatus.ONGOING)
        self.message_user(request, f'อัปเดตสถานะแล้ว {updated} เรื่อง', level=messages.SUCCESS)

    @admin.action(description='เปลี่ยนสถานะเป็น "จบแล้ว"')
    def mark_as_completed(self, request, queryset):
        updated = queryset.update(status=Manga.PublishStatus.COMPLETED)
        self.message_user(request, f'อัปเดตสถานะแล้ว {updated} เรื่อง', level=messages.SUCCESS)

    @admin.action(description='เปลี่ยนสถานะเป็น "พักตอน"')
    def mark_as_hiatus(self, request, queryset):
        updated = queryset.update(status=Manga.PublishStatus.HIATUS)
        self.message_user(request, f'อัปเดตสถานะแล้ว {updated} เรื่อง', level=messages.SUCCESS)


# ---------------------------------------------------------------------------
# Chapter Admin — ZIP processing in save_related
# ---------------------------------------------------------------------------
@admin.register(Chapter)
class ChapterAdmin(ModelAdmin):
    form = ChapterForm
    list_display = ('manga', 'number', 'title', 'page_count', 'uploaded_at')
    list_filter = ('manga', 'uploaded_at')
    search_fields = ('manga__title', 'title')
    inlines = [PageInline]
    autocomplete_fields = ('manga',)
    list_select_related = ('manga',)
    ordering = ('-uploaded_at', '-number')
    list_per_page = 40
    date_hierarchy = 'uploaded_at'
    search_help_text = 'ค้นหาจากชื่อเรื่องหรือชื่อตอน'
    readonly_fields = ('uploaded_at',)

    fieldsets = (
        ('ข้อมูลตอน', {
            'fields': ('manga', 'number', 'title'),
        }),
        ('อัปโหลดรวดเร็ว', {
            'description': 'วิธีที่แนะนำ: อัปโหลดไฟล์ ZIP เพื่อสร้างหน้าทั้งหมดอัตโนมัติ',
            'fields': ('zip_file', 'replace_pages'),
        }),
        ('ข้อมูลระบบ', {
            'fields': ('uploaded_at',),
        }),
    )

    @admin.display(description='จำนวนหน้า')
    def page_count(self, obj):
        return getattr(obj, 'page_count_value', 0)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(page_count_value=Count('pages'))

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        self._import_zip_pages(request, form.instance, form)

    def _import_zip_pages(self, request, chapter, form):
        zf = form.cleaned_data.get('zip_file')
        if not zf:
            return

        replace_pages = form.cleaned_data.get('replace_pages', False)

        if hasattr(zf, 'seek'):
            zf.seek(0)

        try:
            with zipfile.ZipFile(BytesIO(zf.read())) as archive:
                image_names = sorted(
                    [
                        name
                        for name in archive.namelist()
                        if not name.startswith('__MACOSX')
                        and not os.path.basename(name).startswith('.')
                        and os.path.splitext(name)[1].lower() in IMAGE_EXTENSIONS
                    ],
                    key=natural_sort_key,
                )

                if not image_names:
                    self.message_user(
                        request,
                        'ไม่พบไฟล์รูปใน ZIP กรุณาตรวจสอบนามสกุลไฟล์',
                        level=messages.WARNING,
                    )
                    return

                created_count = 0
                with transaction.atomic():
                    if replace_pages:
                        chapter.pages.all().delete()
                        start_num = 1
                    else:
                        last_page = chapter.pages.order_by('-number').first()
                        start_num = (last_page.number + 1) if last_page else 1

                    for idx, name in enumerate(image_names):
                        data = archive.read(name)
                        ext = os.path.splitext(name)[1].lower()
                        filename = f"ch{chapter.number:g}_page{start_num + idx:04d}{ext}"
                        page = Page(chapter=chapter, number=start_num + idx)
                        page.image.save(filename, ContentFile(data), save=True)
                        created_count += 1

                self.message_user(
                    request,
                    f'นำเข้ารูปสำเร็จ {created_count} หน้า (ตอนที่ {chapter.number:g})',
                    level=messages.SUCCESS,
                )
        except zipfile.BadZipFile:
            self.message_user(request, 'ไฟล์ ZIP ไม่ถูกต้อง กรุณาอัปโหลดใหม่', level=messages.ERROR)
