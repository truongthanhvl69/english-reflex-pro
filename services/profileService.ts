import { supabase } from "@/lib/supabaseClient";

export interface ProfileUpdateInput {
  full_name?: string;
  username?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  language?: string;
  notification_study_alerts?: boolean;
  notification_email_reminders?: boolean;
  notification_achievements?: boolean;
  notification_promotions?: boolean;
  privacy_show_on_leaderboard?: boolean;
  privacy_public_profile?: boolean;
  privacy_show_streak?: boolean;
  privacy_show_level?: boolean;
}

export const ProfileService = {
  async updateProfile(userId: string, input: ProfileUpdateInput) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      const msg = error.message || "";
      if (msg.includes("unique constraint") || msg.includes("duplicate key")) {
        throw new Error("Tên người dùng (username) này đã có người sử dụng.");
      }
      throw new Error(msg || "Không thể cập nhật hồ sơ cá nhân.");
    }
    return data;
  },

  async getProfileStats(userId: string) {
    // 1. Get completed lessons count
    const { count: completedLessons } = await supabase
      .from("user_lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");

    // 2. Get total sentences learned (correct attempts count from history)
    const { count: totalSentences } = await supabase
      .from("user_sentence_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_correct", true);

    // 3. Get total time studied (sum response_time_ms)
    const { data: times } = await supabase
      .from("user_sentence_history")
      .select("response_time_ms")
      .eq("user_id", userId);

    let totalTimeSec = 0;
    if (times) {
      const sumMs = times.reduce((acc, curr) => acc + (curr.response_time_ms || 0), 0);
      totalTimeSec = Math.round(sumMs / 1000);
    }

    return {
      completedLessons: completedLessons || 0,
      totalSentences: totalSentences || 0,
      totalTimeSec: totalTimeSec || 0,
      vocabMemorized: totalSentences || 0
    };
  }
};
