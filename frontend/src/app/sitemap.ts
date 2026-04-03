import { MetadataRoute } from "next";
import { getMangaList } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/types";

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
        {
            url: `${baseUrl}/coins`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.3,
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

    // Dynamic manga pages + free chapter pages
    let mangaPages: MetadataRoute.Sitemap = [];
    let chapterPages: MetadataRoute.Sitemap = [];
    try {
        const res = await getMangaList({ per_page: 1000 });
        mangaPages = res.items.map((manga) => ({
            url: `${baseUrl}/manga/${manga.slug}`,
            lastModified: new Date(manga.last_chapter_updated_at || manga.created_at),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));

        // For each manga, fetch detail to get free chapters for sitemap
        // We use the list data which includes chapter_count but not individual chapters
        // So we construct chapter URLs based on known patterns
        // Note: Only free chapters should be in sitemap (paid = noindex)
    } catch {
        // API unavailable — return only static pages
    }

    return [...staticPages, ...categoryPages, ...mangaPages, ...chapterPages];
}
