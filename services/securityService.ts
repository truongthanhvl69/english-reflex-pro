import { supabase } from "@/lib/supabaseClient";

export const SecurityService = {
  async sendPasswordResetEmail(email: string): Promise<void> {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/profile`,
    });

    if (error) {
      throw new Error(error.message || "Không thể gửi yêu cầu đặt lại mật khẩu.");
    }
  },

  async requestEmailChange(newEmail: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("already registered")) {
        throw new Error("Địa chỉ email này đã được đăng ký bởi tài khoản khác.");
      }
      throw new Error(msg || "Không thể gửi yêu cầu thay đổi email.");
    }
  },

  async logOutAllDevices(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      throw new Error(error.message || "Không thể đăng xuất tất cả các thiết bị.");
    }
  },

  async requestAccountDeletion(userId: string): Promise<void> {
    const { error } = await supabase.from("subscription_logs").insert({
      user_id: userId,
      action: "request_deletion",
      details: { requested_at: new Date().toISOString(), status: "pending" }
    });
    if (error) {
      throw new Error(error.message || "Không thể ghi nhận yêu cầu xóa tài khoản.");
    }
  }
};
