import { supabase } from "@/lib/supabaseClient";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar: string | null;
  level: number;
  streak: number;
  exp: number;
  badge: string;
}

export const LeaderboardService = {
  async getTodayLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("leaderboard_today")
      .select("*")
      .order("rank", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("leaderboard_weekly")
      .select("*")
      .order("rank", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getMonthlyLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("leaderboard_monthly")
      .select("*")
      .order("rank", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getTotalLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("leaderboard_total")
      .select("*")
      .order("rank", { ascending: true });
    if (error) throw error;
    return data || [];
  }
};
