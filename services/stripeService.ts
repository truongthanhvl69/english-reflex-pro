import { PaymentService } from "./paymentService";

export const StripeService = {
  async createCheckoutSession(userId: string, plan: "pro" | "premium") {
    return PaymentService.createCheckout(userId, plan, "stripe");
  },

  async verifyCheckoutSession(userId: string, sessionId: string) {
    return PaymentService.verifyPayment(userId, sessionId);
  },

  async cancelSubscription(userId: string) {
    return PaymentService.cancelSubscription(userId);
  },
};
