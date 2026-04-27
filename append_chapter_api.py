with open("frontend/src/lib/api.ts", "a") as f:
    f.write("""
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
      chapter_number: number;
      unlocks: number;
      coins_earned: number;
    }[];
  }>(`/admin-stats/chapters-deepdive?days=${days}`, { token });
}
""")
