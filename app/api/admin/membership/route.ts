import { NextResponse } from "next/server";
import { PaymentService, supabaseAdmin } from "@/services/paymentService";
import { MembershipService } from "@/services/membershipService";

export async function GET(request: Request) {
  try {
    // 1. Fetch memberships joined with profiles
    const { data: members, error: mErr } = await supabaseAdmin
      .from("memberships")
      .select(`
        id,
        user_id,
        membership_type,
        status,
        started_at,
        expired_at,
        auto_renew,
        profiles:user_id (
          full_name,
          email,
          avatar_url,
          level
        )
      `)
      .order("created_at", { ascending: false });

    if (mErr) throw mErr;

    // 2. Fetch payment history logs
    const { data: payments, error: pErr } = await supabaseAdmin
      .from("payment_history")
      .select(`
        id,
        user_id,
        amount,
        currency,
        status,
        provider,
        transaction_id,
        created_at,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (pErr) throw pErr;

    // 3. Fetch payment orders
    const { data: orders, error: oErr } = await supabaseAdmin
      .from("payment_orders")
      .select(`
        id,
        user_id,
        plan_id,
        plan_code,
        amount,
        currency,
        provider,
        status,
        order_code,
        transfer_content,
        created_at,
        paid_at,
        profiles:user_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    if (oErr) throw oErr;

    // 4. Fetch payment settings
    const settings = await PaymentService.getPaymentSettings();

    // 5. Compute stats
    const totalMembers = members?.length || 0;
    const proMembers = members?.filter((m) => m.membership_type === "pro" && m.status === "active").length || 0;
    const premiumMembers = members?.filter((m) => m.membership_type === "premium" && m.status === "active").length || 0;
    const freeMembers = totalMembers - proMembers - premiumMembers;

    // Compute monthly revenue
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSuccessPayments = payments?.filter(
      (p) => p.status === "success" && new Date(p.created_at) >= thirtyDaysAgo
    ) || [];
    
    const monthlyRevenue = recentSuccessPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingOrdersCount = orders?.filter((o) => o.status === "pending_verification").length || 0;

    return NextResponse.json({
      members: members || [],
      payments: payments || [],
      orders: orders || [],
      settings: settings || {},
      stats: {
        totalMembers,
        proMembers,
        premiumMembers,
        freeMembers,
        monthlyRevenue,
        pendingOrdersCount
      },
    });
  } catch (error: any) {
    console.error("Admin GET Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load admin data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, action, plan, durationMonths, orderId, settings } = await request.json();

    if (!action) {
      return NextResponse.json({ error: "Thiếu hành động (action)" }, { status: 400 });
    }

    // A. Approve manual bank transfer order
    if (action === "approve_order") {
      if (!orderId) return NextResponse.json({ error: "Thiếu mã đơn hàng" }, { status: 400 });
      const transactionId = `bank_approved_${Date.now()}`;
      await PaymentService.completeOrder(orderId, transactionId);
      return NextResponse.json({ success: true });
    }

    // B. Decline manual bank transfer order
    if (action === "decline_order") {
      if (!orderId) return NextResponse.json({ error: "Thiếu mã đơn hàng" }, { status: 400 });
      const { error } = await supabaseAdmin
        .from("payment_orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // C. Cancel order
    if (action === "cancel_order") {
      if (!orderId) return NextResponse.json({ error: "Thiếu mã đơn hàng" }, { status: 400 });
      const { error } = await supabaseAdmin
        .from("payment_orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // D. Update payment settings
    if (action === "save_settings") {
      if (!settings || typeof settings !== "object") {
        return NextResponse.json({ error: "Thiếu cấu hình lưu" }, { status: 400 });
      }

      for (const [key, val] of Object.entries(settings)) {
        const { error } = await supabaseAdmin
          .from("payment_settings")
          .upsert({ key, value: val, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      return NextResponse.json({ success: true });
    }

    // E. Force update/upgrade membership (legacy admin panel action)
    if (action === "update_tier") {
      if (!userId || !plan) return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
      await MembershipService.upgradeMembership(userId, plan, durationMonths || 1, "admin_console", `admin_man_${Date.now()}`);
      return NextResponse.json({ success: true });
    }

    // F. Extend membership
    if (action === "extend") {
      if (!userId) return NextResponse.json({ error: "Thiếu user ID" }, { status: 400 });
      const { data: mem } = await supabaseAdmin
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const baseDate = mem?.expired_at ? new Date(mem.expired_at) : new Date();
      if (baseDate < new Date()) {
        baseDate.setTime(Date.now());
      }
      baseDate.setMonth(baseDate.getMonth() + (durationMonths || 1));

      const { data: membership, error: err } = await supabaseAdmin
        .from("memberships")
        .update({
          status: "active",
          expired_at: baseDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .select("*")
        .single();

      if (err) throw err;

      await supabaseAdmin.from("subscription_logs").insert({
        user_id: userId,
        action: "admin_extend",
        details: { durationMonths, newExpiredAt: baseDate.toISOString() },
      });

      return NextResponse.json({ success: true, membership });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute admin action" }, { status: 500 });
  }
}
