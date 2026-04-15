"use client";

import { useEffect } from "react";
import { 
  trackSearchManga, 
  trackViewMangaDetail,
  trackViewCoinPackages 
} from "@/lib/analytics";

/**
 * Helper component to fire analytics events from Server Components upon mount.
 * Example: <AnalyticsTracker event="search_manga" data={{ query: "Action" }} />
 */
export function AnalyticsTracker({ 
  event, 
  data 
}: { 
  event: "search_manga" | "view_item" | "view_coin_packages";
  data?: any;
}) {
  useEffect(() => {
    switch (event) {
      case "search_manga":
        if (data?.query) trackSearchManga(data.query);
        break;
      case "view_item":
        if (data?.slug) trackViewMangaDetail(data.slug, data.title, data.category);
        break;
      case "view_coin_packages":
        trackViewCoinPackages();
        break;
    }
  }, [event, data]);

  return null;
}
