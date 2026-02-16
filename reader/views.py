from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, render

from .models import Chapter, Manga


def home(request):
    q = request.GET.get('q', '').strip()
    selected_category = request.GET.get('category', '').strip()
    selected_status = request.GET.get('status', '').strip()
    selected_sort = request.GET.get('sort', 'latest').strip()

    mangas = Manga.objects.all()

    if q:
        mangas = mangas.filter(Q(title__icontains=q) | Q(description__icontains=q))

    valid_categories = {choice[0] for choice in Manga.Category.choices}
    if selected_category in valid_categories:
        mangas = mangas.filter(category=selected_category)
    else:
        selected_category = ''

    valid_statuses = {choice[0] for choice in Manga.PublishStatus.choices}
    if selected_status in valid_statuses:
        mangas = mangas.filter(status=selected_status)
    else:
        selected_status = ''

    valid_sorts = {'latest', 'chapters'}
    if selected_sort not in valid_sorts:
        selected_sort = 'latest'

    mangas = (
        mangas.annotate(chapter_total=Count('chapters'))
        .prefetch_related('chapters')
    )

    if selected_sort == 'chapters':
        mangas = mangas.order_by('-chapter_total', '-created_at')
    else:
        mangas = mangas.order_by('-created_at')

    paginator = Paginator(mangas, 24)
    page_obj = paginator.get_page(request.GET.get('page'))

    query_params = request.GET.copy()
    query_params.pop('page', None)
    query_without_page = query_params.urlencode()

    latest_chapters = (
        Chapter.objects.select_related('manga')
        .order_by('-uploaded_at', '-number')[:12]
    )

    return render(
        request,
        'reader/home.html',
        {
            'mangas': page_obj.object_list,
            'page_obj': page_obj,
            'total_manga': paginator.count,
            'query_without_page': query_without_page,
            'latest_chapters': latest_chapters,
            'category_choices': Manga.Category.choices,
            'status_choices': Manga.PublishStatus.choices,
            'selected_category': selected_category,
            'selected_status': selected_status,
            'selected_sort': selected_sort,
            'q': q,
        },
    )


def manga_detail(request, pk):
    manga = get_object_or_404(Manga, pk=pk)
    chapters = manga.chapters.annotate(page_total=Count('pages')).order_by('-number')
    first_chapter = chapters.order_by('number').first()
    latest_chapter = chapters.first()

    related_mangas = (
        Manga.objects.filter(category=manga.category)
        .exclude(pk=manga.pk)
        .annotate(chapter_total=Count('chapters'))
        .order_by('-created_at')[:6]
    )

    return render(
        request,
        'reader/manga_detail.html',
        {
            'manga': manga,
            'chapters': chapters,
            'first_chapter': first_chapter,
            'latest_chapter': latest_chapter,
            'related_mangas': related_mangas,
        },
    )


def chapter_read(request, pk):
    chapter = get_object_or_404(Chapter.objects.select_related('manga'), pk=pk)
    pages = chapter.pages.all()
    chapter_list = Chapter.objects.filter(manga=chapter.manga).order_by('-number')

    # Previous / Next chapter navigation
    prev_chapter = (
        Chapter.objects.filter(manga=chapter.manga, number__lt=chapter.number)
        .order_by('-number')
        .first()
    )
    next_chapter = (
        Chapter.objects.filter(manga=chapter.manga, number__gt=chapter.number)
        .order_by('number')
        .first()
    )

    return render(
        request,
        'reader/chapter_read.html',
        {
            'chapter': chapter,
            'pages': pages,
            'prev_chapter': prev_chapter,
            'next_chapter': next_chapter,
            'chapter_list': chapter_list,
            'total_pages': pages.count(),
        },
    )
