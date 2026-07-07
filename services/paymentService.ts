import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

export interface MembershipData {
  id?: string;
  user_id: string;
  plan: "free" | "basic" | "pro" | "premium" | "lifetime";
  status: "active" | "expired" | "canceled" | "none";
  start_date?: string;
  expired_at?: string | null;
  provider?: string | null;
  subscription_id?: string | null;
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  provider: "bank_transfer" | "stripe" | "momo" | "vnpay" | "zalopay";
  status: "pending" | "pending_verification" | "paid" | "failed" | "expired" | "canceled" | "refunded";
  order_code: string;
  transfer_content: string;
  checkout_url: string | null;
  qr_url: string | null;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentProvider {
  createOrder(
    userId: string,
    planId: string,
    amount: number,
    orderCode: string,
    transferContent: string,
    expiryMinutes: number
  ): Promise<{ checkoutUrl: string | null; qrUrl: string | null; expiresAt: string }>;
  verifyPayment(orderId: string): Promise<boolean>;
  refund(orderId: string): Promise<boolean>;
}

// 1. Stripe Payment Provider Implementation
export const StripePaymentProviderImpl: PaymentProvider = {
  async createOrder(userId, planId, amount, orderCode, transferContent, expiryMinutes) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key is not configured.");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const isLifetime = planId === "lifetime";
    const isYearly = planId.endsWith("yearly");

    const lineItems = {
      "line_items[0][price_data][currency]": "vnd",
      "line_items[0][price_data][product_data][name]": `English Reflex ${planId.toUpperCase().replace("_", " ")}`,
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][quantity]": "1",
    };

    const params = new URLSearchParams({
      ...lineItems,
      "success_url": `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&userId=${userId}&plan=${planId}&orderCode=${orderCode}`,
      "cancel_url": `${siteUrl}/pricing`,
      "client_reference_id": userId,
      "metadata[orderCode]": orderCode,
      "metadata[userId]": userId,
      "metadata[plan]": planId,
    });

    if (isLifetime) {
      params.append("mode", "payment");
    } else {
      params.append("mode", "subscription");
      params.append("line_items[0][price_data][recurring][interval]", isYearly ? "year" : "month");
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(`Stripe Checkout Session error: ${errData.error?.message || res.statusText}`);
    }

    const session = await res.json();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    return {
      checkoutUrl: session.url,
      qrUrl: null,
      expiresAt: expiresAt.toISOString(),
    };
  },

  async verifyPayment(orderId) {
    const { data: order } = await supabaseAdmin
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || !order.checkout_url) return false;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) return false;

    // Find session id from checkout URL
    const sessionId = order.checkout_url.split("/").pop() || "";
    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      });

      if (!res.ok) return false;
      const session = await res.json();

      if (session.payment_status === "paid") {
        await PaymentService.completeOrder(orderId, session.id || order.order_code);
        return true;
      }
    } catch (e) {
      console.error("Error verifying Stripe session:", e);
    }
    return false;
  },

  async refund(orderId) {
    return false; // Implement refund logic via Stripe refunds API if needed
  }
};

// 2. Bank Transfer Payment Provider Implementation
export const BankTransferPaymentProviderImpl: PaymentProvider = {
  async createOrder(userId, planId, amount, orderCode, transferContent, expiryMinutes) {
    // Read bank configurations from payment_settings
    const { data: settingsRow } = await supabaseAdmin
      .from("payment_settings")
      .select("value")
      .eq("key", "bank_transfer")
      .maybeSingle();

    const config = settingsRow?.value || {
      bank_name: "Techcombank",
      account_no: "19036789999018",
      account_name: "TRAN VAN TRUONG"
    };

    // Construct standard VietQR code URL
    const bankId = config.bank_name.toLowerCase().replace(/\s+/g, "");
    const accountNo = config.account_no;
    const accountName = encodeURIComponent(config.account_name);
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${accountName}`;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    return {
      checkoutUrl: null,
      qrUrl,
      expiresAt: expiresAt.toISOString()
    };
  },

  async verifyPayment(orderId) {
    // Bank transfers are verified manually by admin or via webhook integration
    return false;
  },

  async refund(orderId) {
    return false;
  }
};

/**
 * CORE PAYMENT SERVICE
 */
export const PaymentService = {
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

  async updatePaymentSetting(key: string, value: any) {
    const { error } = await supabaseAdmin
      .from("payment_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
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

    // 2. Generate unique order code & transfer content
    const orderCode = "ORD" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const userIdShort = userId.substring(0, 3).toUpperCase();
    const orderIdShort = orderCode.slice(-4);
    const transferContent = `EFR-${userIdShort}-${orderIdShort}`;

    // 3. Delegate order details creation to matching provider
    let checkoutUrl = null;
    let qrUrl = null;
    let expiresAt = "";

    // If sandbox mock provider is passed (only in dev/test)
    if (provider === "mock") {
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + expiryMinutes);
      expiresAt = expires.toISOString();
      checkoutUrl = `/checkout/mock?userId=${userId}&plan=${planId}&orderCode=${orderCode}`;
    } else if (provider === "stripe") {
      const result = await StripePaymentProviderImpl.createOrder(
        userId, planId, amount, orderCode, transferContent, expiryMinutes
      );
      checkoutUrl = result.checkoutUrl;
      expiresAt = result.expiresAt;
    } else if (provider === "bank_transfer") {
      const result = await BankTransferPaymentProviderImpl.createOrder(
        userId, planId, amount, orderCode, transferContent, expiryMinutes
      );
      qrUrl = result.qrUrl;
      expiresAt = result.expiresAt;
    } else {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }

    // 4. Save order to payment_orders table
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        user_id: userId,
        plan_id: planId,
        amount,
        currency,
        provider,
        status: "pending",
        order_code: orderCode,
        transfer_content: transferContent,
        checkout_url: checkoutUrl,
        qr_url: qrUrl,
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (orderErr) throw orderErr;
    return order as PaymentOrder;
  },

  async getMembership(userId: string): Promise<MembershipData | null> {
    if (!userId) return null;
    const { data } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data as MembershipData;
  },

  async upgradeMembership(
    userId: string,
    plan: "basic" | "pro" | "premium" | "lifetime",
    durationMonths: number,
    provider: string,
    subscriptionId?: string
  ): Promise<MembershipData> {
    const startDate = new Date();
    let expiredAt: Date | null = new Date();
    
    if (plan === "lifetime") {
      expiredAt = null;
    } else {
      expiredAt.setMonth(expiredAt.getMonth() + durationMonths);
    }

    const { data: membership, error: memError } = await supabaseAdmin
      .from("memberships")
      .upsert({
        user_id: userId,
        plan,
        status: "active",
        start_date: startDate.toISOString(),
        expired_at: expiredAt ? expiredAt.toISOString() : null,
        provider,
        subscription_id: subscriptionId || `sub_${provider}_${Date.now()}`,
      }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (memError) throw memError;

    // Trigger tier update in profiles table directly
    await supabaseAdmin
      .from("profiles")
      .update({ 
        membership_type: plan,
        subscription_tier: plan === "lifetime" ? "pro" : plan
      })
      .eq("id", userId);

    // 2. Log subscription event
    await supabaseAdmin.from("subscription_logs").insert({
      user_id: userId,
      action: "upgrade",
      details: { plan, durationMonths, provider, subscriptionId, expiredAt: expiredAt ? expiredAt.toISOString() : "lifetime" },
    });

    return membership as MembershipData;
  },

  async completeOrder(orderId: string, transactionId: string): Promise<void> {
    const { data: order } = await supabaseAdmin
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.status === "paid") return;

    // 1. Update order status to paid
    await supabaseAdmin
      .from("payment_orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", orderId);

    // 2. Create successful payment history record
    await supabaseAdmin.from("payment_history").insert({
      user_id: order.user_id,
      amount: order.amount,
      currency: order.currency,
      status: "success",
      provider: order.provider,
      transaction_id: transactionId,
    });

    // 3. Upgrade user membership
    const plan = order.plan_id.includes("pro") ? "pro" : order.plan_id.includes("basic") ? "basic" : "lifetime";
    const duration = order.plan_id.endsWith("yearly") ? 12 : 1;
    await this.upgradeMembership(order.user_id, plan, duration, order.provider, transactionId);
  },

  async verifyPayment(orderId: string): Promise<boolean> {
    const { data: order } = await supabaseAdmin
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return false;
    if (order.status === "paid") return true;

    if (order.provider === "stripe") {
      return StripePaymentProviderImpl.verifyPayment(orderId);
    }
    
    if (order.provider === "mock") {
      await this.completeOrder(orderId, `mock_success_${Date.now()}`);
      return true;
    }

    return false;
  },

  async cancelSubscription(userId: string): Promise<boolean> {
    const mem = await this.getMembership(userId);
    if (!mem || mem.plan === "free" || mem.status !== "active") return false;

    if (mem.provider === "stripe" && mem.subscription_id) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        try {
          const res = await fetch(`https://api.stripe.com/v1/subscriptions/${mem.subscription_id}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
          });

          if (res.ok) {
            await supabaseAdmin
              .from("memberships")
              .update({ status: "canceled" })
              .eq("user_id", userId);

            await supabaseAdmin.from("subscription_logs").insert({
              user_id: userId,
              action: "cancel_subscription",
              details: { provider: "stripe", subscriptionId: mem.subscription_id },
            });
            return true;
          }
        } catch (e) {
          console.error("Stripe cancellation failed:", e);
        }
      }
    }

    await supabaseAdmin
      .from("memberships")
      .update({ status: "canceled" })
      .eq("user_id", userId);

    await supabaseAdmin.from("subscription_logs").insert({
      user_id: userId,
      action: "cancel_subscription",
      details: { provider: mem.provider, subscriptionId: mem.subscription_id },
    });

    return true;
  },

  async restorePurchase(userId: string): Promise<MembershipData | null> {
    const mem = await this.getMembership(userId);
    if (!mem || mem.plan === "free") return mem;

    if (mem.expired_at && new Date(mem.expired_at) < new Date()) {
      const { data } = await supabaseAdmin
        .from("memberships")
        .update({ plan: "free", status: "expired" })
        .eq("user_id", userId)
        .select("*")
        .single();
      
      await supabaseAdmin.from("subscription_logs").insert({
        user_id: userId,
        action: "expired",
        details: { oldPlan: mem.plan },
      });
      return data as MembershipData;
    }

    return mem;
  },
};
