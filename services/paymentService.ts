import { createClient } from "@supabase/supabase-js";
import { StripeService } from "./stripeService";
import { BankTransferService } from "./bankTransferService";
import { MembershipService } from "./membershipService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Fallback to publishable anon key in browser environment to prevent script load crash
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

export interface MembershipData {
  id?: string;
  user_id: string;
  membership_type: "free" | "basic" | "pro" | "premium" | "lifetime";
  status: "active" | "expired" | "cancelled" | "none";
  started_at?: string;
  expired_at?: string | null;
  provider?: string | null;
  subscription_id?: string | null;
  auto_renew?: boolean;
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  plan_id: string;
  plan_code: string;
  amount: number;
  currency: string;
  provider: "bank_transfer" | "stripe" | "momo" | "vnpay" | "zalopay" | "mock";
  status: "pending" | "pending_verification" | "paid" | "failed" | "expired" | "cancelled" | "refunded";
  order_code: string;
  transfer_content: string;
  checkout_url: string | null;
  qr_url: string | null;
  expires_at: string;
  paid_at: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const PaymentService = {
  // Check tables at startup to prevent app crashes and log warnings clearly
  async autoCheckDatabase() {
    const tables = ["plans", "payment_orders", "payment_history", "memberships", "payment_settings"];
    for (const t of tables) {
      try {
        const { error } = await supabaseAdmin.from(t).select("*").limit(1);
        if (error && error.code !== "PGRST116") {
          console.warn(`[WARNING] Table check failed for "${t}":`, error.message);
        } else {
          console.log(`[DATABASE] Table "${t}" exists and is accessible.`);
        }
      } catch (e: any) {
        console.warn(`[WARNING] Exception checking table "${t}":`, e.message || e);
      }
    }
  },

  async getPaymentSettings() {
    const { data } = await supabaseAdmin.from("payment_settings").select("*");
    const settings: Record<string, any> = {};
    if (data) {
      data.forEach((row) => {
        settings[row.key] = row.value;
      });
    }
    return settings;
  },

  async getOrderById(orderId: string) {
    return supabaseAdmin
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
  },

  async createCheckout(
    userId: string,
    planId: "pro_monthly" | "pro_yearly" | "basic_monthly" | "lifetime",
    provider: "stripe" | "bank_transfer" | "mock"
  ): Promise<PaymentOrder> {
    // 1. Fetch package pricing
    const settings = await this.getPaymentSettings();
    const pricing = settings.plans_pricing || {
      pro_monthly: 99000,
      pro_yearly: 948000,
      basic_monthly: 49000,
      lifetime: 1999000
    };

    const general = settings.general || {
      currency: "VND",
      order_expiry_minutes: 15
    };

    const amount = pricing[planId] || 99000;
    const currency = general.currency || "VND";
    const expiryMinutes = general.order_expiry_minutes || 15;

    // plan code
    const planCode = planId.includes("pro") ? "PRO" : planId.includes("basic") ? "BASIC" : "LIFETIME";

    // 2. Generate unique order code & transfer content
    const orderCode = "ORD" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const userIdShort = userId.substring(0, 3).toUpperCase();
    const orderIdShort = orderCode.slice(-4);
    const transferContent = `EFR-${userIdShort}-${orderIdShort}`;

    let checkoutUrl = null;
    let qrUrl = null;
    let expiresAt = "";

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + expiryMinutes);
    expiresAt = expires.toISOString();

    if (provider === "mock") {
      checkoutUrl = `/checkout/mock?userId=${userId}&plan=${planId}&orderCode=${orderCode}`;
    } else if (provider === "stripe") {
      const stripeRes = await StripeService.createCheckoutSession(
        userId, planId, amount, orderCode, expiryMinutes
      );
      checkoutUrl = stripeRes.checkoutUrl;
      expiresAt = stripeRes.expiresAt;
    } else if (provider === "bank_transfer") {
      qrUrl = await BankTransferService.generateOrderQR(amount, transferContent);
    } else {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        user_id: userId,
        plan_id: planId,
        plan_code: planCode,
        amount,
        currency,
        provider,
        status: "pending",
        order_code: orderCode,
        transfer_content: transferContent,
        checkout_url: checkoutUrl,
        qr_url: qrUrl,
        expires_at: expiresAt,
        metadata: { planId, provider }
      })
      .select("*")
      .single();

    if (orderErr) throw orderErr;
    return order as PaymentOrder;
  },

  async verifyPayment(orderId: string): Promise<boolean> {
    const { data: order } = await this.getOrderById(orderId);
    if (!order) return false;
    if (order.status === "paid") return true;

    if (order.provider === "stripe") {
      return StripeService.verifyCheckoutSession(orderId);
    }
    
    if (order.provider === "mock") {
      await this.completeOrder(orderId, `mock_success_${Date.now()}`);
      return true;
    }

    return false;
  },

  async completeOrder(orderId: string, transactionId: string): Promise<void> {
    const { data: order } = await this.getOrderById(orderId);
    if (!order || order.status === "paid") return;

    // 1. Update order status to paid
    await supabaseAdmin
      .from("payment_orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", orderId);

    // 2. Create successful payment history record
    await supabaseAdmin.from("payment_history").insert({
      user_id: order.user_id,
      plan_id: order.plan_id,
      order_id: orderId,
      amount: order.amount,
      currency: order.currency,
      status: "success",
      provider: order.provider,
      transaction_id: transactionId,
      paid_at: new Date().toISOString()
    });

    // 3. Upgrade user membership
    const plan = order.plan_id.includes("pro") ? "pro" : order.plan_id.includes("basic") ? "basic" : "lifetime";
    const duration = order.plan_id.endsWith("yearly") ? 12 : 1;
    await MembershipService.upgradeMembership(order.user_id, plan, duration, order.provider, transactionId);
  },

  async cancelSubscription(userId: string): Promise<boolean> {
    return MembershipService.cancelSubscription(userId);
  }
};

// Auto check database immediately when service is loaded
if (process.env.NODE_ENV !== "test") {
  void PaymentService.autoCheckDatabase();
}
