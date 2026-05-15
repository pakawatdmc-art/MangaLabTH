/* ── API client for FastAPI backend ── */

import type {
  Manga,
  MangaDetail,
  MangaCategory,
  MangaStatus,
  Chapter,
  ChapterDetail,
  PaginatedResponse,
  User,
  Transaction,
  CoinPackage,
} from "./types";

// Server-side (SSR/ISR): call FastAPI directly via localhost (zero network latency)
// Client-side (Browser): use relative path → Next.js rewrites proxy to FastAPI
const API = typeof window === "undefined"
  ? (process.env.INTERNAL_API_URL || "http://localhost:8000/api/v1")
  : "/api/v1";

async function fetcher<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...init } = options || {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(`${API}${path}`, { ...init, headers });
      if (res.ok || (res.status >= 400 && res.status < 500)) break;
    } catch (err) {
      lastError = err;
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }

  if (!res) {
    throw lastError || new Error("Network error");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body.detail)
      ? body.detail
        .map((d: unknown) => {
          if (typeof d === "object" && d !== null && "msg" in d) {
            const msg = (d as { msg?: unknown }).msg;
            if (typeof msg === "string") {
              return msg;
            }
          }
          return JSON.stringify(d);
        })
        .join(", ")
      : body.detail;
    throw new Error(detail || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Manga ───────────────────────────────────────

export async function getMangaList(params?: {
  page?: number;
  per_page?: number;
  category?: MangaCategory;
  status?: MangaStatus;
  q?: string;
  sort?: string;
}, token?: string) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.per_page) sp.set("per_page", String(params.per_page));
  if (params?.category) sp.set("category", params.category);
  if (params?.status) sp.set("status", params.status);
  if (params?.q) sp.set("q", params.q);
  if (params?.sort) sp.set("sort", params.sort);
  const qs = sp.toString();
  return fetcher<PaginatedResponse<Manga>>(`/manga${qs ? `?${qs}` : ""}`, {
    token,
    // V13: Enable ISR (Incremental Static Regeneration) caching for 60 seconds
    next: { revalidate: 60, tags: ["manga-list"] }
  });
}

export async function getManga(id: string, token?: string) {
  return fetcher<MangaDetail>(
    `/manga/${id}`,
    token ? { token, cache: "no-store", next: { revalidate: 0 } } : { next: { revalidate: 60, tags: [`manga-${id}`] } }
  );
}

export async function getMangaBySlug(slug: string, token?: string, opts?: { noTrack?: boolean }) {
  const qs = opts?.noTrack ? "?no_track=true" : "";
  return fetcher<MangaDetail>(
    `/manga/slug/${slug}${qs}`,
    token
      ? { token, cache: "no-store", next: { revalidate: 0 } }
      : { next: { revalidate: 60 } }
  );
}

// ── Chapters ────────────────────────────────────

export async function getChapters(mangaId: string, token?: string) {
  return fetcher<Chapter[]>(
    `/chapters/manga/${mangaId}`,
    token ? { token } : undefined
  );
}

export async function getChapter(chapterId: string, token?: string) {
  return fetcher<ChapterDetail>(
    `/chapters/${chapterId}`,
    token ? { token, cache: "no-store", next: { revalidate: 0 } } : undefined
  );
}

// ── User ────────────────────────────────────────

export async function getMe(token: string) {
  return fetcher<User>("/users/me", { token });
}

// ── Transactions ────────────────────────────────

export async function unlockChapter(chapterId: string, token: string) {
  return fetcher<{ success: boolean; new_balance: number; transaction_id: string }>(
    "/transactions/unlock",
    { method: "POST", body: JSON.stringify({ chapter_id: chapterId }), token }
  );
}

export async function getMyTransactions(token: string, limit = 50) {
  return fetcher<Transaction[]>(`/transactions/me?limit=${limit}`, { token });
}

// ── Admin ───────────────────────────────────────

export async function createManga(data: Partial<Manga>, token: string) {
  return fetcher<Manga>("/manga", { method: "POST", body: JSON.stringify(data), token });
}

export async function updateManga(id: string, data: Partial<Manga>, token: string) {
  return fetcher<Manga>(`/manga/${id}`, { method: "PATCH", body: JSON.stringify(data), token });
}

export async function deleteManga(id: string, token: string) {
  return fetcher<void>(`/manga/${id}`, { method: "DELETE", token });
}

export async function createChapter(
  mangaId: string,
  data: { number: number; title?: string; coin_price?: number; is_free?: boolean; unlocks_at?: string | null },
  token: string
) {
  return fetcher<Chapter>(`/chapters/manga/${mangaId}`, {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export async function replacePages(
  chapterId: string,
  pages: { number: number; image_url: string; width: number; height: number }[],
  token: string
) {
  return fetcher(`/chapters/${chapterId}/pages`, {
    method: "PUT",
    body: JSON.stringify(pages),
    token,
  });
}

export async function deleteChapter(id: string, token: string) {
  return fetcher<void>(`/chapters/${id}`, { method: "DELETE", token });
}

export async function updateChapter(
  chapterId: string,
  data: { number?: number; title?: string; coin_price?: number; is_free?: boolean; unlocks_at?: string | null },
  token: string
) {
  return fetcher<Chapter>(`/chapters/${chapterId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    token,
  });
}

export async function addPages(
  chapterId: string,
  pages: { number: number; image_url: string; width: number; height: number }[],
  token: string
) {
  return fetcher(`/chapters/${chapterId}/pages`, {
    method: "POST",
    body: JSON.stringify(pages),
    token,
  });
}

export async function adminGrantCoins(
  userId: string,
  amount: number,
  note: string,
  token: string
) {
  return fetcher<Transaction>("/transactions/admin/grant", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, amount, note }),
    token,
  });
}

export async function listUsers(
  token: string,
  params?: { page?: number; per_page?: number; q?: string; role?: string }
) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.per_page) sp.set("per_page", String(params.per_page));
  if (params?.q) sp.set("q", params.q);
  if (params?.role) sp.set("role", params.role);
  const qs = sp.toString();
  return fetcher<{
    items: User[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }>(`/users${qs ? `?${qs}` : ""}`, { token });
}

export async function updateUser(userId: string, data: { role?: string; coin_balance?: number }, token: string) {
  return fetcher<User>(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data), token });
}

export async function deleteUser(userId: string, token: string) {
  return fetcher<void>(`/users/${userId}`, { method: "DELETE", token });
}

export async function adminGetStats(token: string) {
  return fetcher<{
    total_manga: number;
    total_chapters: number;
    total_users: number;
    total_coins_in_circulation: number;
    total_views: number;
  }>("/users/stats", { token });
}

export async function listAllTransactions(
  token: string,
  params?: { page?: number; per_page?: number; type?: string; q?: string }
) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.per_page) sp.set("per_page", String(params.per_page));
  if (params?.type) sp.set("type", params.type);
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  return fetcher<{
    items: Transaction[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  }>(`/transactions${qs ? `?${qs}` : ""}`, { token });
}

export async function getTransactionSummary(
  token: string,
  params?: { type?: string; q?: string }
) {
  const sp = new URLSearchParams();
  if (params?.type) sp.set("type", params.type);
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  return fetcher<{
    total_in: number;
    total_out: number;
    net_balance: number;
    total_count: number;
  }>(`/transactions/summary${qs ? `?${qs}` : ""}`, { token });
}


export async function listAllChapters(token: string) {
  return fetcher<Chapter[]>("/chapters", { token });
}

// ── Analytics & Stats ────────────────────────────────────

export async function getStats(token: string) {
  return fetcher<{
    total_manga: number;
    total_chapters: number;
    total_users: number;
    total_coins_in_circulation: number;
    total_views: number;
  }>("/users/stats", { token });
}

export async function getMarketingAnalytics(token: string, days = 30) {
  return fetcher<{
    summary: {
      total_views: number;
      total_reads: number;
      new_users: number;
      total_users: number;
    };
    previous_summary: {
      total_views: number;
      total_reads: number;
      new_users: number;
      total_users: number;
    };
    views_by_category: { category: string; views: number }[];
    chart_data: { date: string; views: number; reads: number }[];
    top_traffic_mangas: { id: string; title: string; slug: string; cover_image: string; views: number; reads: number }[];
  }>(`/admin-stats/overview?days=${days}`, { token });
}

export async function getTopManga(period: "weekly" | "monthly" | "all_time", limit = 10) {
  return fetcher<Manga[]>(`/manga/ranking/${period}?limit=${limit}`, {
    next: { revalidate: 300, tags: ["manga-ranking"] }
  });
}

export async function getPackages() {
  return fetcher<CoinPackage[]>("/payments/packages");
}

export async function createCheckoutSession(packageId: string, method: "qr" | "truewallet", token: string) {
  return fetcher<{
    url?: string;
    raw?: string;
    qr_data?: string;
    type: string;
    action_url?: string;
    parameters?: Record<string, string>;
    reference_no?: string;
  }>(`/payments/checkout?package_id=${packageId}&method=${method}`, {
    method: "POST",
    token,
  });
}

export async function confirmCheckoutPayment(referenceNo: string, token: string) {
  return fetcher<{ status: string; new_balance?: number; coins?: number }>(
    `/payments/confirm?reference_no=${encodeURIComponent(referenceNo)}`,
    {
      method: "POST",
      token,
    }
  );
}

// ── Upload (R2 via Backend Proxy) ────────────────

export async function uploadCoverImage(file: File, token: string): Promise<string> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 60000;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/upload/cover`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type — browser sets it automatically with boundary
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data.public_url;
      }

      // Client errors (4xx) should not be retried
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "อัปโหลดรูปภาพล้มเหลว");
      }

      lastError = new Error(`Server error ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      // Don't retry client errors or intentional aborts that we re-threw
      if (err instanceof Error && !err.message.startsWith("Server error") && err.name !== "AbortError") {
        throw err;
      }
      lastError = err;
    }

    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error("อัปโหลดรูปภาพล้มเหลว หลังจากลองหลายครั้ง");
}

export async function uploadChapterPage(file: File, key: string, token: string): Promise<{ public_url: string; key: string; width: number; height: number }> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 60000;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("key", key);

      const res = await fetch(`${API}/upload/chapter_page`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return res.json();
      }

      // Client errors (4xx) should not be retried
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "อัปโหลดภาพตอนล้มเหลว");
      }

      lastError = new Error(`Server error ${res.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      // Don't retry client errors that we re-threw
      if (err instanceof Error && !err.message.startsWith("Server error") && err.name !== "AbortError") {
        throw err;
      }
      lastError = err;
    }

    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error("อัปโหลดภาพตอนล้มเหลว หลังจากลองหลายครั้ง");
}

export async function getPresignedUploadUrls(
  files: { key: string; content_type: string }[],
  token: string
) {
  return fetcher<{ upload_url: string; public_url: string; key: string }[]>(
    "/upload/presigned",
    { method: "POST", body: JSON.stringify({ files }), token }
  );
}

export async function cleanupOrphanedFiles(keys: string[], token: string) {
  return fetcher<void>("/upload/cleanup", {
    method: "POST",
    body: JSON.stringify({ keys }),
    token,
  });
}

export async function getChaptersForManga(mangaId: string, token?: string) {
  return fetcher<Chapter[]>(
    `/chapters/manga/${mangaId}`,
    token ? { token, cache: "no-store", next: { revalidate: 0 } } : undefined
  );
}

// ── Settings ────────────────────────────────────

export async function getTheme() {
  return fetcher<{ theme: string }>("/settings/theme");
}

export async function setTheme(theme: string, token: string) {
  return fetcher<{ theme: string; success: boolean }>("/settings/theme", {
    method: "POST",
    body: JSON.stringify({ theme }),
    token,
  });
}

export async function getCoinDeepdiveAnalytics(token: string, days = 30) {
  return fetcher<{
    arppu: number;
    conversion_rate: number;
    total_earned: number;
    total_burned: number;
    prev_earned: number;
    prev_burned: number;
    coin_trend: { date: string; coins_purchased: number; coins_burned: number }[];
    package_popularity: { name: string; price_thb: number; coins: number; count: number }[];
    top_grossing_chapters: { chapter_id: string; chapter_number: number; manga_title: string; manga_slug: string; coins_earned: number }[];
    top_spenders: { user_id: string; display_name: string; total_spent: number }[];
  }>(`/admin-stats/coin-deepdive?days=${days}`, { token });
}

export async function getUserDeepdiveAnalytics(token: string, days = 30) {
  return fetcher<{
    summary: {
      total_users: number;
      new_users: number;
      active_spenders: number;
    };
    previous_summary: {
      total_users: number;
      new_users: number;
      active_spenders: number;
    };
    segments: {
      paid_users: number;
      free_users: number;
    };
    registration_trend: { date: string; new_users: number }[];
    wealth_distribution: { tier: string; count: number }[];
    top_coin_holders: {
      id: string;
      display_name: string;
      coin_balance: number;
      created_at: string;
    }[];
  }>(`/admin-stats/users-deepdive?days=${days}`, { token });
}

export async function getChapterDeepdiveAnalytics(token: string, days = 30) {
  return fetcher<{
    summary: {
      total_chapters: number;
      new_chapters: number;
      total_unlocks: number;
      coins_burned: number;
    };
    previous_summary: {
      total_chapters: number;
      new_chapters: number;
      total_unlocks: number;
      coins_burned: number;
    };
    segments: {
      paid_chapters: number;
      free_chapters: number;
    };
    unlock_trend: { date: string; unlocks: number; coins_burned: number }[];
    top_chapters: {
      manga_title: string;
      manga_slug: string;
      chapter_number: number;
      unlocks: number;
      coins_earned: number;
    }[];
  }>(`/admin-stats/chapters-deepdive?days=${days}`, { token });
}

export async function getMangaDeepdiveAnalytics(token: string, days = 30) {
  return fetcher<{
    summary: {
      total_mangas: number;
      new_mangas: number;
      ongoing_mangas: number;
      read_through_rate: number;
    };
    previous_summary: {
      total_mangas: number;
      new_mangas: number;
      ongoing_mangas: number;
      read_through_rate: number;
    };
    status_distribution: {
      ongoing: number;
      completed: number;
      hiatus: number;
      dropped: number;
    };
    revenue_by_category: { category: string; revenue: number }[];
    top_franchises: {
      id: string;
      title: string;
      slug: string;
      views: number;
      reads: number;
      revenue: number;
    }[];
  }>(`/admin-stats/mangas-deepdive?days=${days}`, { token });
}
