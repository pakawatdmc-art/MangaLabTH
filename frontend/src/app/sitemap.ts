import { MetadataRoute } from "next";
import { getMangaList } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/types";

// Force dynamic rendering so the sitemap always reflects the latest data
// instead of being cached at build time (when the API may be unreachable).
export const dynamic = "force-dynamic";
export const revalidate = 60; // ISR: regenerate at most every 60 seconds

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://mangalab-th.com";

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.5,
        },
    ];

    // Category pages
    const categoryPages: MetadataRoute.Sitemap = Object.keys(CATEGORY_LABELS).map(
        (cat) => ({
            url: `${baseUrl}/category/${cat}`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        })
    );

    // Dynamic manga pages
    let mangaPages: MetadataRoute.Sitemap = [];
    try {
        // Fetch all pages to ensure no manga is missing from sitemap
        const allItems = [];
        let currentPage = 1;
        let totalPages = 1;
        do {
            const res = await getMangaList({ page: currentPage, per_page: 100 });
            allItems.push(...res.items);
            totalPages = res.pages;
            currentPage++;
        } while (currentPage <= totalPages);

        mangaPages = allItems.map((manga) => ({
            url: `${baseUrl}/manga/${encodeURIComponent(manga.slug)}`,
            lastModified: new Date((manga.last_chapter_updated_at || manga.created_at) + "Z"),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));
    } catch (err) {
        // API unavailable — return only static pages
        console.error("[sitemap] Failed to fetch manga list:", err);
    }

    return [...staticPages, ...categoryPages, ...mangaPages];
}
