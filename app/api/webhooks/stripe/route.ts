import { NextResponse } from "next/server";
import { PaymentService, supabaseAdmin } from "@/services/paymentService";
import { WebhookService } from "@/services/webhookService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripeSignature = request.headers.get("stripe-signature");
  if (!stripeSignature) {
    return NextResponse.json({ error: "No signature header found" }, { status: 400 });
  }

  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch (err) {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  // 1. Cryptographic Signature Verification
  if (stripeWebhookSecret) {
    const isValid = WebhookService.verifyStripeSignature(rawBody, stripeSignature, stripeWebhookSecret);
    if (!isValid) {
      await WebhookService.logWebhook("stripe", "unknown", { error: "Signature verification failed", body: rawBody }, "failed", "Signature check failed");
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  console.log("🔔 Stripe webhook verified:", event.type);

  // 2. Log webhook event
  const { data: logEntry } = await supabaseAdmin.from("payment_webhook_logs").insert({
    provider: "stripe",
    event: event.type,
    payload: event,
    status: "processing"
  }).select("id").single();

  const logId = logEntry?.id;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const orderCode = session.metadata?.orderCode;

        if (orderCode) {
          const { data: order } = await supabaseAdmin
            .from("payment_orders")
            .select("id")
            .eq("order_code", orderCode)
            .maybeSingle();

          if (order) {
            await PaymentService.completeOrder(order.id, session.id);
            // Save Stripe subscription information to memberships
            if (session.subscription) {
              await supabaseAdmin
                .from("memberships")
                .update({ 
                  subscription_id: session.subscription, 
                  provider: "stripe",
                  updated_at: new Date().toISOString()
                })
                .eq("user_id", userId);
            }
            console.log(`✅ Membership upgraded for user ${userId} via Stripe Webhook`);
          } else {
            throw new Error(`Order not found for code: ${orderCode}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { data: membership } = await supabaseAdmin
          .from("memberships")
          .select("user_id, membership_type")
          .eq("subscription_id", subscription.id)
          .maybeSingle();

        if (membership) {
          await supabaseAdmin
            .from("memberships")
            .update({ 
              membership_type: "free", 
              status: "expired", 
              expired_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("subscription_id", subscription.id);

          await supabaseAdmin
            .from("profiles")
            .update({ membership_type: "free", subscription_tier: "free" })
            .eq("id", membership.user_id);

          await supabaseAdmin.from("subscription_logs").insert({
            user_id: membership.user_id,
            action: "stripe_subscription_deleted",
            details: { subscriptionId: subscription.id, previousPlan: membership.membership_type },
          });

          console.log(`❌ Subscription expired/deleted: Downgraded user ${membership.user_id}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const { data: payment } = await supabaseAdmin
          .from("payment_history")
          .select("user_id")
          .eq("transaction_id", charge.payment_intent)
          .maybeSingle();

        if (payment) {
          await supabaseAdmin
            .from("memberships")
            .update({ 
              membership_type: "free", 
              status: "expired",
              updated_at: new Date().toISOString()
            })
            .eq("user_id", payment.user_id);

          await supabaseAdmin
            .from("profiles")
            .update({ membership_type: "free", subscription_tier: "free" })
            .eq("id", payment.user_id);

          await supabaseAdmin
            .from("payment_history")
            .update({ status: "refunded" })
            .eq("transaction_id", charge.payment_intent);

          console.log(`↩️ Refunded: Downgraded user ${payment.user_id}`);
        }
        break;
      }
    }

    if (logId) {
      await supabaseAdmin.from("payment_webhook_logs")
        .update({ status: "success" })
        .eq("id", logId);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook Processing Error:", error);
    if (logId) {
      await supabaseAdmin.from("payment_webhook_logs")
        .update({ status: "failed", error: error.message || "Failed during handler execution" })
        .eq("id", logId);
    }
    return NextResponse.json({ error: error.message || "Webhook handler failed" }, { status: 500 });
  }
}
