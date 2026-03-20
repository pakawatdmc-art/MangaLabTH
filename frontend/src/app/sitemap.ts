import { MetadataRoute } from "next";
import { getMangaList } from "@/lib/api";

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
    ];

    // Dynamic manga pages
    let mangaPages: MetadataRoute.Sitemap = [];
    try {
        const res = await getMangaList({ per_page: 1000 });
        mangaPages = res.items.map((manga) => ({
            url: `${baseUrl}/manga/${manga.slug}`,
            lastModified: new Date(manga.last_chapter_updated_at || manga.created_at),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));
    } catch {
        // API unavailable — return only static pages
    }

    return [...staticPages, ...mangaPages];
}
