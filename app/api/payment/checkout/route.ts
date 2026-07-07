import { NextResponse } from "next/server";
import { PaymentService } from "@/services/paymentService";

export async function POST(request: Request) {
  try {
    const { userId, planId, provider } = await request.json();

    if (!userId || !planId || !provider) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const validPlans = ["pro_monthly", "pro_yearly", "basic_monthly", "lifetime"];
    if (!validPlans.includes(planId)) {
      return NextResponse.json({ error: "Gói nâng cấp không hợp lệ" }, { status: 400 });
    }

    const order = await PaymentService.createCheckout(userId, planId, provider);
    return NextResponse.json({
      order,
      checkoutUrl: order.checkout_url,
      orderCode: order.order_code,
      qrUrl: order.qr_url
    });
  } catch (error: any) {
    // Catch-all translation of technical errors into a friendly prompt, logging raw error to server logs
    console.error("Checkout API Error:", error);
    return NextResponse.json({
      error: "Không thể tạo đơn thanh toán.\nHệ thống đang được cập nhật.\nVui lòng thử lại sau."
    }, { status: 500 });
  }
}
