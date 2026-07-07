import { supabase } from "@/lib/supabaseClient";

export interface UserMembership {
  user_id: string;
  plan: "free" | "basic" | "pro" | "lifetime";
  status: "active" | "canceled" | "expired" | "none";
  start_date: string;
  expired_at: string | null;
  subscription_id: string | null;
  provider: string | null;
}

export const MembershipService = {
  async getMembership(userId: string): Promise<UserMembership | null> {
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading membership info:", error);
      return null;
    }
    return data;
  },

  async cancelAutoRenewal(userId: string): Promise<void> {
    const { error } = await supabase
      .from("memberships")
      .update({ status: "canceled" })
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message || "Không thể thực hiện hủy tự động gia hạn.");
    }
  }
};
