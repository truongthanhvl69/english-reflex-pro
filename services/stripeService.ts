import { PaymentService } from "./paymentService";

export const StripeService = {
  async createCheckoutSession(userId: string, plan: "pro_monthly" | "pro_yearly" | "basic_monthly" | "lifetime") {
    return PaymentService.createCheckout(userId, plan, "stripe");
  },

  async verifyCheckoutSession(userId: string, sessionId: string) {
    return PaymentService.verifyPayment(sessionId);
  },

  async cancelSubscription(userId: string) {
    return PaymentService.cancelSubscription(userId);
  },
};
