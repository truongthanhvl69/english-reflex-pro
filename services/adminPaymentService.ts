import { PaymentService, supabaseAdmin } from "./paymentService";

export const AdminPaymentService = {
  async approveBankTransfer(orderId: string): Promise<void> {
    const transactionId = `bank_approved_${Date.now()}`;
    await PaymentService.completeOrder(orderId, transactionId);
  },

  async declineBankTransfer(orderId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("payment_orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  },

  async cancelOrder(orderId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("payment_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  },

  async saveSettings(settings: Record<string, any>): Promise<void> {
    for (const [key, val] of Object.entries(settings)) {
      const { error } = await supabaseAdmin
        .from("payment_settings")
        .upsert({ key, value: val, updated_at: new Date().toISOString() });
      if (error) throw error;
    }
  }
};
export default AdminPaymentService;
