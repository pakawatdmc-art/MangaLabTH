import { sendGAEvent } from "@next/third-parties/google";

/**
 * Standardize types of Google Analytics Events used in MangaLabTH
 */

// 1. Acquisition & Interest
export const trackSearchManga = (query: string) => {
  sendGAEvent("event", "search_manga", { search_term: query });
};

export const trackViewMangaDetail = (slug: string, title?: string, category?: string) => {
  sendGAEvent("event", "view_manga_detail", {
    manga_slug: slug,
    manga_title: title,
    manga_category: category,
  });
};

// 2. Engagement
export const trackReadChapterStart = (mangaSlug: string, chapterId: string, chapterNumber: number, isFree: boolean) => {
  sendGAEvent("event", "read_chapter_start", {
    manga_slug: mangaSlug,
    chapter_id: chapterId,
    chapter_number: chapterNumber,
    is_free: isFree,
  });
};

export const trackReadChapterComplete = (mangaSlug: string, chapterId: string) => {
  sendGAEvent("event", "read_chapter_complete", {
    manga_slug: mangaSlug,
    chapter_id: chapterId,
  });
};

// TODO: Connect to bookmark/favorite UI when feature is implemented
export const trackAddBookmark = (mangaSlug: string, title?: string) => {
  sendGAEvent("event", "add_bookmark", {
    manga_slug: mangaSlug,
    manga_title: title,
  });
};

// 3. Monetization 
export const trackViewCoinPackages = () => {
  sendGAEvent("event", "view_coin_packages");
};

export const trackSelectPackage = (packageId: string, valueThb: number, coins: number) => {
  sendGAEvent("event", "select_package", {
    package_id: packageId,
    value: valueThb,
    currency: "THB",
    coins: coins,
  });
};

export const trackPurchase = (transactionId: string, valueThb: number, coins: number) => {
  // Using standard GA4 e-commerce naming
  sendGAEvent("event", "purchase", {
    transaction_id: transactionId,
    value: valueThb,
    currency: "THB",
    items: [
      {
        item_id: "coin_package",
        item_name: `${coins} Coins`,
        price: valueThb,
        quantity: 1
      }
    ]
  });
};

export const trackUnlockChapter = (mangaSlug: string, chapterId: string, coinPrice: number) => {
  sendGAEvent("event", "unlock_chapter", {
    manga_slug: mangaSlug,
    chapter_id: chapterId,
    value_coins: coinPrice,
  });
};

export const trackInsufficientCoins = (mangaSlug: string, chapterId: string, requiredCoins: number) => {
  sendGAEvent("event", "insufficient_coins", {
    manga_slug: mangaSlug,
    chapter_id: chapterId,
    required_coins: requiredCoins,
  });
};
