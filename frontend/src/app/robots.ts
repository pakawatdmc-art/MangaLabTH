import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Read the site URL from environment variables, fallback if missing
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mangalabth.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/_next/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
