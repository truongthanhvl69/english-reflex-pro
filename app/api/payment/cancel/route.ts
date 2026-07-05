import { NextResponse } from "next/server";
import { PaymentService } from "@/services/paymentService";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Thiếu thông tin người dùng" }, { status: 400 });
    }

    const success = await PaymentService.cancelSubscription(userId);
    if (success) {
      return NextResponse.json({ success: true, message: "Đã hủy tự động gia hạn thành công." });
    } else {
      return NextResponse.json({ error: "Không tìm thấy gói đăng ký hoạt động hoặc không thể hủy lúc này" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Cancel API Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi hủy đăng ký" }, { status: 500 });
  }
}
