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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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

export async function getMangaBySlug(slug: string, token?: string) {
  return fetcher<MangaDetail>(
    `/manga/slug/${slug}`,
    token ? { token, cache: "no-store", next: { revalidate: 0 } } : undefined
  );
}

// ── Chapters ────────────────────────────────────

export async function getChapters(mangaId: string) {
  return fetcher<Chapter[]>(`/chapters/manga/${mangaId}`);
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
  data: { number: number; title?: string; coin_price?: number; is_free?: boolean },
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
  data: { number?: number; title?: string; coin_price?: number; is_free?: boolean },
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

export async function listUsers(token: string) {
  return fetcher<User[]>("/users", { token });
}

export async function updateUser(userId: string, data: { role?: string; coin_balance?: number }, token: string) {
  return fetcher<User>(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data), token });
}

export async function listAllTransactions(token: string) {
  return fetcher<Transaction[]>("/transactions", { token });
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
      total_users: number;
      coins_earned_30d: number;
      coins_spent_30d: number;
    };
    chart_data: { date: string; views: number; coins_purchased: number; coins_spent: number }[];
    top_grossing_mangas: { id: string; title: string; slug: string; cover_image: string; coins_earned: number }[];
    top_viewed_mangas: { id: string; title: string; slug: string; cover_image: string; total_views: number }[];
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
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API}/upload/cover`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — browser sets it automatically with boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "อัปโหลดรูปภาพล้มเหลว");
  }

  const data = await res.json();
  return data.public_url;
}

export async function uploadChapterPage(file: File, key: string, token: string): Promise<{ public_url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);

  const res = await fetch(`${API}/upload/chapter_page`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "อัปโหลดภาพตอนล้มเหลว");
  }

  return res.json();
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
