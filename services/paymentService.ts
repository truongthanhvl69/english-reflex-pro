import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Server-side admin client to bypass RLS policies securely for payment processing
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

export interface MembershipData {
  id?: string;
  user_id: string;
  plan: "free" | "pro" | "premium";
  status: "active" | "expired" | "canceled" | "none";
  start_date?: string;
  expired_at?: string | null;
  provider?: string | null;
  subscription_id?: string | null;
}

export interface PaymentLog {
  id?: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  provider: string;
  transaction_id?: string;
}

/**
 * CORE PAYMENT SERVICE
 * Extensible design supporting multiple payment gateways (Mock, Stripe, etc.)
 */
export const PaymentService = {
  /**
   * Get active membership for a user
   */
  async getMembership(userId: string): Promise<MembershipData | null> {
    if (!userId) return null;
    const { data, error } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching membership:", error);
      return null;
    }
    return data as MembershipData;
  },

  /**
   * Directly upgrade/modify a membership record (called by webhook or mock payment)
   */
  async upgradeMembership(
    userId: string,
    plan: "pro" | "premium",
    durationMonths: number,
    provider: string,
    subscriptionId?: string
  ): Promise<MembershipData> {
    const startDate = new Date();
    const expiredAt = new Date();
    expiredAt.setMonth(expiredAt.getMonth() + durationMonths);

    const { data: membership, error: memError } = await supabaseAdmin
      .from("memberships")
      .upsert({
        user_id: userId,
        plan,
        status: "active",
        start_date: startDate.toISOString(),
        expired_at: expiredAt.toISOString(),
        provider,
        subscription_id: subscriptionId || `sub_mock_${Date.now()}`,
      }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (memError) throw memError;

    // 2. Log subscription event
    await supabaseAdmin.from("subscription_logs").insert({
      user_id: userId,
      action: "upgrade",
      details: { plan, durationMonths, provider, subscriptionId, expiredAt: expiredAt.toISOString() },
    });

    return membership as MembershipData;
  },

  /**
   * Create checkout session
   */
  async createCheckout(
    userId: string,
    planId: "pro" | "premium",
    provider: "stripe" | "mock"
  ): Promise<{ checkoutUrl: string; sessionId?: string }> {
    const amount = planId === "pro" ? 99000 : 199000; // 99k for Pro, 199k for Premium (hypothetical)
    const currency = "VND";

    if (provider === "mock") {
      // Create a mock transaction in database
      const transactionId = `txn_mock_${Date.now()}`;
      
      const { error: payError } = await supabaseAdmin.from("payment_history").insert({
        user_id: userId,
        amount,
        currency,
        status: "pending",
        provider: "mock",
        transaction_id: transactionId,
      });

      if (payError) throw payError;

      // In a mock payment, the checkout URL redirects to our mock payment process handler
      const checkoutUrl = `/checkout/mock?userId=${userId}&plan=${planId}&txnId=${transactionId}`;
      return { checkoutUrl, sessionId: transactionId };
    }

    if (provider === "stripe") {
      // Stripe provider checkout integration
      // To avoid introducing external npm dependencies, we make direct HTTP REST calls to Stripe APIs
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new Error("Stripe secret key is not configured. Please use Mock provider for testing.");
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const transactionId = `txn_stripe_${Date.now()}`;

      try {
        const params = new URLSearchParams({
          "payment_method_types[0]": "card",
          "line_items[0][price_data][currency]": "vnd",
          "line_items[0][price_data][product_data][name]": `English Reflex ${planId.toUpperCase()}`,
          "line_items[0][price_data][unit_amount]": String(amount),
          "line_items[0][price_data][recurring][interval]": "month",
          "line_items[0][quantity]": "1",
          "mode": "subscription",
          "success_url": `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&userId=${userId}&plan=${planId}`,
          "cancel_url": `${siteUrl}/pricing`,
          "client_reference_id": userId,
          "metadata[txnId]": transactionId,
          "metadata[userId]": userId,
          "metadata[plan]": planId,
        });

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
          throw new Error(`Stripe API error: ${errData.error?.message || res.statusText}`);
        }

        const session = await res.json();
        
        // Log transaction start
        await supabaseAdmin.from("payment_history").insert({
          user_id: userId,
          amount,
          currency,
          status: "pending",
          provider: "stripe",
          transaction_id: session.id,
        });

        return { checkoutUrl: session.url, sessionId: session.id };
      } catch (err) {
        console.error("Stripe Checkout Error:", err);
        throw err;
      }
    }

    throw new Error(`Unsupported payment provider: ${provider}`);
  },

  /**
   * Verify completed payment session
   */
  async verifyPayment(userId: string, transactionId: string): Promise<{ success: boolean }> {
    if (transactionId.startsWith("txn_mock_")) {
      // Mock payment auto-verifies
      const { data: payment } = await supabaseAdmin
        .from("payment_history")
        .select("*")
        .eq("transaction_id", transactionId)
        .maybeSingle();

      if (payment && payment.status === "pending") {
        // Update payment log to success
        await supabaseAdmin
          .from("payment_history")
          .update({ status: "success" })
          .eq("transaction_id", transactionId);

        // Upgrade membership
        const plan = transactionId.includes("premium") ? "premium" : "pro";
        await this.upgradeMembership(userId, plan, 1, "mock", `sub_mock_${Date.now()}`);
        return { success: true };
      }
      return { success: payment?.status === "success" };
    }

    // Stripe validation
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false };
    }

    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${transactionId}`, {
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      });

      if (!res.ok) return { success: false };
      const session = await res.json();

      if (session.payment_status === "paid") {
        const plan = session.metadata?.plan === "premium" ? "premium" : "pro";
        const clientUserId = session.client_reference_id || session.metadata?.userId || userId;
        
        // Update payment history
        await supabaseAdmin
          .from("payment_history")
          .update({ status: "success" })
          .eq("transaction_id", transactionId);

        // Upgrade
        await this.upgradeMembership(clientUserId, plan, 1, "stripe", session.subscription);
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      console.error("Error verifying payment:", e);
      return { success: false };
    }
  },

  /**
   * Cancel auto-renew of active subscription
   */
  async cancelSubscription(userId: string): Promise<boolean> {
    const mem = await this.getMembership(userId);
    if (!mem || mem.plan === "free" || mem.status !== "active") return false;

    if (mem.provider === "stripe" && mem.subscription_id) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        try {
          // Tell Stripe to cancel subscription at period end
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
          console.error("Stripe subscription cancellation failed:", e);
        }
      }
    }

    // Cancel mock subscription
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

  /**
   * Restore expired or canceled purchases if active
   */
  async restorePurchase(userId: string): Promise<MembershipData | null> {
    const mem = await this.getMembership(userId);
    if (!mem || mem.plan === "free") return mem;

    // Check if membership is expired
    if (mem.expired_at && new Date(mem.expired_at) < new Date()) {
      // Downgrade to free
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
