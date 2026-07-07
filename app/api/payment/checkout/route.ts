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
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi tạo phiên thanh toán" }, { status: 500 });
  }
}
