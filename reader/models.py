from django.db import models


class Manga(models.Model):
    class Category(models.TextChoices):
        ACTION = 'action', 'แอ็กชัน'
        ROMANCE = 'romance', 'โรแมนติก'
        FANTASY = 'fantasy', 'แฟนตาซี'
        DRAMA = 'drama', 'ดราม่า'
        COMEDY = 'comedy', 'คอเมดี้'
        HORROR = 'horror', 'สยองขวัญ'
        SLICE_OF_LIFE = 'slice_of_life', 'ชีวิตประจำวัน'
        OTHER = 'other', 'อื่นๆ'

    class PublishStatus(models.TextChoices):
        ONGOING = 'ongoing', 'กำลังอัปเดต'
        COMPLETED = 'completed', 'จบแล้ว'
        HIATUS = 'hiatus', 'พักตอน'

    title = models.CharField('ชื่อเรื่อง', max_length=255)
    description = models.TextField('เรื่องย่อ', blank=True)
    category = models.CharField(
        'หมวดหมู่',
        max_length=30,
        choices=Category.choices,
        default=Category.OTHER,
    )
    status = models.CharField(
        'สถานะ',
        max_length=20,
        choices=PublishStatus.choices,
        default=PublishStatus.ONGOING,
    )
    cover = models.ImageField('ภาพปก', upload_to='covers/')
    created_at = models.DateTimeField('วันที่เพิ่มเรื่อง', auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'มังงะ'
        verbose_name_plural = 'มังงะ'

    def __str__(self):
        return self.title


class Chapter(models.Model):
    manga = models.ForeignKey(
        Manga,
        verbose_name='มังงะ',
        on_delete=models.CASCADE,
        related_name='chapters',
    )
    title = models.CharField('ชื่อตอน', max_length=255, blank=True)
    number = models.FloatField('ตอนที่', help_text='ตัวอย่าง: 1, 2, 10.5')
    uploaded_at = models.DateTimeField('วันที่อัปโหลด', auto_now_add=True)

    class Meta:
        ordering = ['-number']
        unique_together = ('manga', 'number')
        verbose_name = 'ตอน'
        verbose_name_plural = 'ตอน'

    def __str__(self):
        label = f"ตอนที่ {self.number:g}"
        if self.title:
            label += f" - {self.title}"
        return f"{self.manga.title} | {label}"


class Page(models.Model):
    chapter = models.ForeignKey(
        Chapter,
        verbose_name='ตอน',
        on_delete=models.CASCADE,
        related_name='pages',
    )
    image = models.ImageField('รูปหน้า', upload_to='pages/')
    number = models.PositiveIntegerField('ลำดับหน้า')

    class Meta:
        ordering = ['number']
        unique_together = ('chapter', 'number')
        verbose_name = 'หน้า'
        verbose_name_plural = 'หน้า'

    def __str__(self):
        return f"หน้า {self.number}"
