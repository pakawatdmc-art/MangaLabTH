import shutil
import tempfile
import zipfile
from io import BytesIO
from uuid import uuid4

from django.contrib.admin.sites import AdminSite
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import HttpRequest
from django.test import TestCase, override_settings
from django.urls import reverse

from .admin import ChapterAdmin
from .models import Chapter, Manga, Page


class ReaderViewTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media = tempfile.mkdtemp(prefix="mangafactory_test_media_")
        cls._media_override = override_settings(MEDIA_ROOT=cls._temp_media)
        cls._media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_override.disable()
        shutil.rmtree(cls._temp_media, ignore_errors=True)
        super().tearDownClass()

    def _image_file(self, suffix="jpg"):
        return SimpleUploadedFile(
            name=f"{uuid4().hex}.{suffix}",
            content=b"fake-image-bytes",
            content_type="image/jpeg",
        )

    def _create_manga(self, title, category=Manga.Category.ACTION, status=Manga.PublishStatus.ONGOING):
        return Manga.objects.create(
            title=title,
            category=category,
            status=status,
            cover=self._image_file(),
        )

    def _create_chapter(self, manga, number, title=""):
        return Chapter.objects.create(manga=manga, number=number, title=title)

    def _create_page(self, chapter, number):
        return Page.objects.create(chapter=chapter, number=number, image=self._image_file())

    def test_home_filters_by_search_category_and_status(self):
        self._create_manga("Hero Romance", category=Manga.Category.ROMANCE)
        self._create_manga("Hero Hiatus", category=Manga.Category.ACTION, status=Manga.PublishStatus.HIATUS)
        matched = self._create_manga("Hero Action", category=Manga.Category.ACTION, status=Manga.PublishStatus.ONGOING)

        response = self.client.get(
            reverse("reader:home"),
            {
                "q": "Hero",
                "category": Manga.Category.ACTION,
                "status": Manga.PublishStatus.ONGOING,
            },
        )

        self.assertEqual(response.status_code, 200)
        mangas = list(response.context["mangas"])
        self.assertEqual(len(mangas), 1)
        self.assertEqual(mangas[0].pk, matched.pk)

    def test_home_sort_by_chapter_count(self):
        manga_one = self._create_manga("One Chapter")
        manga_three = self._create_manga("Three Chapters")

        self._create_chapter(manga_one, 1)
        self._create_chapter(manga_three, 1)
        self._create_chapter(manga_three, 2)
        self._create_chapter(manga_three, 3)

        response = self.client.get(reverse("reader:home"), {"sort": "chapters"})

        self.assertEqual(response.status_code, 200)
        mangas = list(response.context["mangas"])
        self.assertGreaterEqual(len(mangas), 2)
        self.assertEqual(mangas[0].pk, manga_three.pk)

    def test_home_pagination(self):
        for index in range(26):
            self._create_manga(f"Manga {index}")

        response = self.client.get(reverse("reader:home"), {"page": 2})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["page_obj"].number, 2)
        self.assertEqual(response.context["total_manga"], 26)
        self.assertEqual(len(response.context["mangas"]), 2)

    def test_manga_detail_includes_first_latest_and_related(self):
        main = self._create_manga("Main", category=Manga.Category.ACTION)
        related = self._create_manga("Related", category=Manga.Category.ACTION)
        unrelated = self._create_manga("Unrelated", category=Manga.Category.ROMANCE)

        chapter_1 = self._create_chapter(main, 1)
        chapter_2 = self._create_chapter(main, 2)

        response = self.client.get(reverse("reader:manga_detail", args=[main.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["first_chapter"].pk, chapter_1.pk)
        self.assertEqual(response.context["latest_chapter"].pk, chapter_2.pk)

        related_ids = {m.pk for m in response.context["related_mangas"]}
        self.assertIn(related.pk, related_ids)
        self.assertNotIn(unrelated.pk, related_ids)

    def test_chapter_read_context_has_navigation_and_page_count(self):
        manga = self._create_manga("Read Test")
        chapter_1 = self._create_chapter(manga, 1)
        chapter_2 = self._create_chapter(manga, 2)
        chapter_3 = self._create_chapter(manga, 3)

        self._create_page(chapter_2, 1)
        self._create_page(chapter_2, 2)

        response = self.client.get(reverse("reader:chapter_read", args=[chapter_2.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["prev_chapter"].pk, chapter_1.pk)
        self.assertEqual(response.context["next_chapter"].pk, chapter_3.pk)
        self.assertEqual(response.context["total_pages"], 2)

        chapter_list = list(response.context["chapter_list"])
        self.assertEqual(chapter_list[0].pk, chapter_3.pk)


class ChapterZipImportTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media = tempfile.mkdtemp(prefix="mangafactory_test_media_")
        cls._media_override = override_settings(MEDIA_ROOT=cls._temp_media)
        cls._media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_override.disable()
        shutil.rmtree(cls._temp_media, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.chapter_admin = ChapterAdmin(Chapter, AdminSite())
        self.chapter_admin.message_user = lambda *args, **kwargs: None

    def _image_file(self, suffix="jpg", content=b"fake-image-bytes"):
        return SimpleUploadedFile(
            name=f"{uuid4().hex}.{suffix}",
            content=content,
            content_type="image/jpeg",
        )

    def _create_manga(self, title="Zip Test"):
        return Manga.objects.create(
            title=title,
            category=Manga.Category.ACTION,
            status=Manga.PublishStatus.ONGOING,
            cover=self._image_file(),
        )

    def _create_chapter(self, manga, number=1):
        return Chapter.objects.create(manga=manga, number=number)

    def _create_page(self, chapter, number, content=b"existing"):
        return Page.objects.create(chapter=chapter, number=number, image=self._image_file(content=content))

    def _zip_upload(self, files):
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, mode="w") as archive:
            for filename, content in files.items():
                archive.writestr(filename, content)

        return SimpleUploadedFile(
            name="pages.zip",
            content=buffer.getvalue(),
            content_type="application/zip",
        )

    def _run_zip_import(self, chapter, zip_upload, replace_pages=False):
        form = type(
            "DummyForm",
            (),
            {"cleaned_data": {"zip_file": zip_upload, "replace_pages": replace_pages}},
        )
        request = HttpRequest()
        self.chapter_admin._import_zip_pages(request, chapter, form)

    def _read_page_bytes(self, page):
        with page.image.open("rb") as file_handle:
            return file_handle.read()

    def test_zip_import_uses_natural_sort_order(self):
        chapter = self._create_chapter(self._create_manga())
        zip_upload = self._zip_upload(
            {
                "10.jpg": b"ten",
                "2.jpg": b"two",
                "1.jpg": b"one",
            }
        )

        self._run_zip_import(chapter, zip_upload)

        pages = list(chapter.pages.order_by("number"))
        self.assertEqual([page.number for page in pages], [1, 2, 3])
        self.assertEqual(self._read_page_bytes(pages[0]), b"one")
        self.assertEqual(self._read_page_bytes(pages[1]), b"two")
        self.assertEqual(self._read_page_bytes(pages[2]), b"ten")

    def test_zip_import_appends_when_not_replacing(self):
        chapter = self._create_chapter(self._create_manga())
        self._create_page(chapter, 1)
        self._create_page(chapter, 2)

        zip_upload = self._zip_upload({"1.jpg": b"new-1", "2.jpg": b"new-2"})
        self._run_zip_import(chapter, zip_upload, replace_pages=False)

        page_numbers = list(chapter.pages.order_by("number").values_list("number", flat=True))
        self.assertEqual(page_numbers, [1, 2, 3, 4])

    def test_zip_import_replaces_existing_pages_when_requested(self):
        chapter = self._create_chapter(self._create_manga())
        self._create_page(chapter, 1, content=b"old")
        self._create_page(chapter, 2, content=b"old")

        zip_upload = self._zip_upload({"1.jpg": b"fresh"})
        self._run_zip_import(chapter, zip_upload, replace_pages=True)

        pages = list(chapter.pages.order_by("number"))
        self.assertEqual([page.number for page in pages], [1])
        self.assertEqual(self._read_page_bytes(pages[0]), b"fresh")

    def test_zip_import_ignores_hidden_and_non_image_files(self):
        chapter = self._create_chapter(self._create_manga())
        zip_upload = self._zip_upload(
            {
                "__MACOSX/1.jpg": b"ignored",
                ".DS_Store": b"ignored",
                "notes.txt": b"ignored",
                "page001.jpg": b"valid",
            }
        )

        self._run_zip_import(chapter, zip_upload)

        self.assertEqual(chapter.pages.count(), 1)
        self.assertEqual(chapter.pages.first().number, 1)
        self.assertEqual(self._read_page_bytes(chapter.pages.first()), b"valid")

    def test_invalid_zip_does_not_delete_existing_pages(self):
        chapter = self._create_chapter(self._create_manga())
        self._create_page(chapter, 1, content=b"keep")

        bad_zip = SimpleUploadedFile(
            name="broken.zip",
            content=b"this-is-not-a-zip",
            content_type="application/zip",
        )

        self._run_zip_import(chapter, bad_zip, replace_pages=True)

        pages = list(chapter.pages.order_by("number"))
        self.assertEqual(len(pages), 1)
        self.assertEqual(pages[0].number, 1)
        self.assertEqual(self._read_page_bytes(pages[0]), b"keep")
