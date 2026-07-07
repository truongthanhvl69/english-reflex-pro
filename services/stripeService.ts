import { PaymentService } from "./paymentService";
import { MembershipService } from "./membershipService";

export const StripeService = {
  async createCheckoutSession(
    userId: string,
    planId: string,
    amount: number,
    orderCode: string,
    expiryMinutes: number
  ): Promise<{ checkoutUrl: string; expiresAt: string }> {
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
      throw new Error(`Stripe API: ${errData.error?.message || res.statusText}`);
    }

    const session = await res.json();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    return {
      checkoutUrl: session.url,
      expiresAt: expiresAt.toISOString(),
    };
  },

  async verifyCheckoutSession(orderId: string): Promise<boolean> {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) return false;

    const { data: order } = await PaymentService.getOrderById(orderId);
    if (!order || !order.checkout_url) return false;

    const sessionId = order.checkout_url.split("/").pop() || "";
    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      });
      if (!res.ok) return false;
      const session = await res.json();

      if (session.payment_status === "paid") {
        await PaymentService.completeOrder(orderId, session.id);
        return true;
      }
    } catch (e) {
      console.error("Error verifying Stripe session:", e);
    }
    return false;
  },

  async cancelSubscription(userId: string) {
    return MembershipService.cancelSubscription(userId);
  }
};
export default StripeService;
