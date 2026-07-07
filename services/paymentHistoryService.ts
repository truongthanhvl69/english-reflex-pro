import { supabase } from "@/lib/supabaseClient";

export interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  provider: string;
  transaction_id: string | null;
  created_at: string;
}

export const PaymentHistoryService = {
  async getPaymentHistory(userId: string): Promise<PaymentRecord[]> {
    const { data, error } = await supabase
      .from("payment_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading payment history:", error);
      return [];
    }
    return data || [];
  }
};
