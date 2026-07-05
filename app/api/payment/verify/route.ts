import { NextResponse } from "next/server";
import { PaymentService } from "@/services/paymentService";

export async function POST(request: Request) {
  try {
    const { userId, sessionId } = await request.json();

    if (!userId || !sessionId) {
      return NextResponse.json({ error: "Thiếu thông tin xác thực giao dịch" }, { status: 400 });
    }

    const { success } = await PaymentService.verifyPayment(userId, sessionId);
    if (success) {
      return NextResponse.json({ success: true, message: "Giao dịch đã được xác minh thành công" });
    } else {
      return NextResponse.json({ success: false, error: "Giao dịch không thành công hoặc chưa được thanh toán" });
    }
  } catch (error: any) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi xác minh giao dịch" }, { status: 500 });
  }
}
