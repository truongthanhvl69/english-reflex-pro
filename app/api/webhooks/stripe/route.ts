import { NextResponse } from "next/server";
import { PaymentService, supabaseAdmin } from "@/services/paymentService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripeSignature = request.headers.get("stripe-signature");
  if (!stripeSignature) {
    return NextResponse.json({ error: "No signature header found" }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody);

    console.log("🔔 Stripe webhook event received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const plan = session.metadata?.plan || "pro";

        if (userId) {
          // Record successful payment history
          await supabaseAdmin.from("payment_history").insert({
            user_id: userId,
            amount: session.amount_total ? session.amount_total / 100 : 99000,
            currency: session.currency?.toUpperCase() || "VND",
            status: "success",
            provider: "stripe",
            transaction_id: session.id,
          });

          // Upgrade the membership
          await PaymentService.upgradeMembership(userId, plan, 1, "stripe", session.subscription);
          console.log(`✅ Membership upgraded for user ${userId} via Stripe Webhook`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        
        // Find membership by subscription ID
        const { data: membership } = await supabaseAdmin
          .from("memberships")
          .select("user_id, plan")
          .eq("subscription_id", subscription.id)
          .maybeSingle();

        if (membership) {
          // Downgrade user to free
          await supabaseAdmin
            .from("memberships")
            .update({ plan: "free", status: "expired" })
            .eq("subscription_id", subscription.id);

          await supabaseAdmin.from("subscription_logs").insert({
            user_id: membership.user_id,
            action: "stripe_subscription_deleted",
            details: { subscriptionId: subscription.id, previousPlan: membership.plan },
          });

          console.log(`❌ Subscription expired/deleted: Downgraded user ${membership.user_id}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        
        // Find payment history record
        const { data: payment } = await supabaseAdmin
          .from("payment_history")
          .select("user_id")
          .eq("transaction_id", charge.payment_intent)
          .maybeSingle();

        if (payment) {
          // Downgrade user to free
          await supabaseAdmin
            .from("memberships")
            .update({ plan: "free", status: "expired" })
            .eq("user_id", payment.user_id);

          // Update payment log to refunded
          await supabaseAdmin
            .from("payment_history")
            .update({ status: "refunded" })
            .eq("transaction_id", charge.payment_intent);

          await supabaseAdmin.from("subscription_logs").insert({
            user_id: payment.user_id,
            action: "stripe_refunded",
            details: { chargeId: charge.id, paymentIntent: charge.payment_intent },
          });

          console.log(`↩️ Subscription refunded: Downgraded user ${payment.user_id}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook Error:", error);
    return NextResponse.json({ error: error.message || "Webhook handler failed" }, { status: 500 });
  }
}
