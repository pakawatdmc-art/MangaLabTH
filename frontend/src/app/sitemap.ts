import { MetadataRoute } from "next";
import { getMangaList, getMangaBySlug } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/types";
import { parseUTCDate } from "@/lib/utils";

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
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/coins`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.4,
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

    // Dynamic manga + chapter pages
    let mangaPages: MetadataRoute.Sitemap = [];
    let chapterPages: MetadataRoute.Sitemap = [];
    try {
        // Fetch all manga (paginated)
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
            lastModified: parseUTCDate(manga.last_chapter_updated_at || manga.created_at),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));

        // Fetch chapter details in parallel batches for chapter URLs
        const BATCH_SIZE = 10;
        for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
            const batch = allItems.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map((m) => getMangaBySlug(m.slug))
            );

            for (const result of results) {
                if (result.status === "fulfilled") {
                    const manga = result.value;
                    for (const ch of manga.chapters || []) {
                        chapterPages.push({
                            url: `${baseUrl}/${encodeURIComponent(manga.slug)}/${encodeURIComponent(`ตอนที่-${ch.number}`)}`,
                            lastModified: parseUTCDate(ch.published_at),
                            changeFrequency: "monthly" as const,
                            priority: 0.6,
                        });
                    }
                }
            }
        }
    } catch (err) {
        // API unavailable — return only static pages
        console.error("[sitemap] Failed to fetch manga list:", err);
    }

    return [...staticPages, ...categoryPages, ...mangaPages, ...chapterPages];
}
