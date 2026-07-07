import { NextResponse } from "next/server";
import crypto from "crypto";
import { PaymentService, supabaseAdmin } from "@/services/paymentService";

export const runtime = "nodejs";

function verifyStripeSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  try {
    const parts = signature.split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));
    if (!tPart || !v1Part) return false;

    const timestamp = tPart.substring(2);
    const signatureHash = v1Part.substring(3);

    const payload = `${timestamp}.${rawBody}`;
    const expectedHash = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch (e) {
    return false;
  }
}

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
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // 1. Verify webhook signature if secret is configured in environment
  if (stripeWebhookSecret) {
    const isValid = verifyStripeSignature(rawBody, stripeSignature, stripeWebhookSecret);
    if (!isValid) {
      // Log failed verification
      await supabaseAdmin.from("payment_webhook_logs").insert({
        provider: "stripe",
        event_type: "unknown",
        payload: { error: "Signature verification failed", body: rawBody },
        status: "failed",
        error_message: "Signature verification failed"
      });
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

  // 2. Log webhook details to database
  const { data: logEntry } = await supabaseAdmin.from("payment_webhook_logs").insert({
    provider: "stripe",
    event_type: event.type,
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
          // Look up corresponding order code in payment_orders
          const { data: order } = await supabaseAdmin
            .from("payment_orders")
            .select("id")
            .eq("order_code", orderCode)
            .maybeSingle();

          if (order) {
            await PaymentService.completeOrder(order.id, session.id);
            console.log(`✅ Membership upgraded for user ${userId} via Stripe Webhook`);
          } else {
            throw new Error(`Order not found for code: ${orderCode}`);
          }
        } else if (userId) {
          // Fallback legacy method
          const plan = session.metadata?.plan || "pro";
          const amount = session.amount_total ? session.amount_total / 100 : 99000;
          const currency = session.currency?.toUpperCase() || "VND";

          await supabaseAdmin.from("payment_history").insert({
            user_id: userId,
            amount,
            currency,
            status: "success",
            provider: "stripe",
            transaction_id: session.id,
          });

          await PaymentService.upgradeMembership(userId, plan, 1, "stripe", session.subscription);
          console.log(`✅ Legacy membership upgraded for user ${userId} via Stripe Webhook`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        
        const { data: membership } = await supabaseAdmin
          .from("memberships")
          .select("user_id, plan")
          .eq("subscription_id", subscription.id)
          .maybeSingle();

        if (membership) {
          await supabaseAdmin
            .from("memberships")
            .update({ plan: "free", status: "expired", expired_at: new Date().toISOString() })
            .eq("subscription_id", subscription.id);

          await supabaseAdmin
            .from("profiles")
            .update({ membership_type: "free", subscription_tier: "free" })
            .eq("id", membership.user_id);

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
        
        const { data: payment } = await supabaseAdmin
          .from("payment_history")
          .select("user_id")
          .eq("transaction_id", charge.payment_intent)
          .maybeSingle();

        if (payment) {
          await supabaseAdmin
            .from("memberships")
            .update({ plan: "free", status: "expired" })
            .eq("user_id", payment.user_id);

          await supabaseAdmin
            .from("profiles")
            .update({ membership_type: "free", subscription_tier: "free" })
            .eq("id", payment.user_id);

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
        .update({ status: "failed", error_message: error.message || "Failed during handler execution" })
        .eq("id", logId);
    }
    return NextResponse.json({ error: error.message || "Webhook handler failed" }, { status: 500 });
  }
}
