import { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/types";
import { parseUTCDate } from "@/lib/utils";

// Cache the sitemap aggressively — Google + Bing only need fresh data every few hours.
// The previous 60-second + force-dynamic combo was the second largest source of
// Supabase egress (a single bot crawl re-pulled every manga + every chapter).
export const revalidate = 21600; // 6 hours

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

    // Dynamic manga + chapter pages — single slim API call, no N+1.
    let mangaPages: MetadataRoute.Sitemap = [];
    const chapterPages: MetadataRoute.Sitemap = [];
    try {
        const data = await getSitemapData();

        mangaPages = data.map((m) => ({
            url: `${baseUrl}/manga/${encodeURIComponent(m.slug)}`,
            lastModified: parseUTCDate(m.last_chapter_updated_at || m.created_at),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }));

        for (const m of data) {
            for (const ch of m.chapters) {
                chapterPages.push({
                    url: `${baseUrl}/${encodeURIComponent(m.slug)}/${encodeURIComponent(`ตอนที่-${ch.number}`)}`,
                    lastModified: parseUTCDate(ch.published_at),
                    changeFrequency: "monthly" as const,
                    priority: 0.6,
                });
            }
        }
    } catch (err) {
        // API unavailable — return only static pages
        console.error("[sitemap] Failed to fetch sitemap data:", err);
    }

    return [...staticPages, ...categoryPages, ...mangaPages, ...chapterPages];
}
