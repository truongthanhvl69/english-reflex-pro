import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/services/paymentService";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Thiếu mã đơn hàng" }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    return NextResponse.json({
      status: order.status,
      paidAt: order.paid_at
    });
  } catch (error: any) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi kiểm tra đơn hàng" }, { status: 500 });
  }
}
