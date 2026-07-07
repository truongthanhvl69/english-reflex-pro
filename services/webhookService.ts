import crypto from "crypto";
import { supabaseAdmin } from "./paymentService";

export const WebhookService = {
  verifyStripeSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
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
  },

  async logWebhook(provider: string, event: string, payload: any, status: string, error?: string) {
    return supabaseAdmin.from("payment_webhook_logs").insert({
      provider,
      event,
      payload,
      status,
      error
    });
  }
};
export default WebhookService;
