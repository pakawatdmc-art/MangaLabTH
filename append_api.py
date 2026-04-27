with open("frontend/src/lib/api.ts", "a") as f:
    f.write("""
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
""")
