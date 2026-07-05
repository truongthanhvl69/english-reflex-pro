import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/services/paymentService";

export async function GET(request: Request) {
  try {
    // 1. Fetch memberships joined with profiles
    const { data: members, error: mErr } = await supabaseAdmin
      .from("memberships")
      .select(`
        id,
        user_id,
        plan,
        status,
        start_date,
        expired_at,
        provider,
        subscription_id,
        profiles:user_id (
          full_name,
          email,
          avatar_url,
          level
        )
      `)
      .order("created_at", { ascending: false });

    if (mErr) throw mErr;

    // 2. Fetch payment history
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

    // 3. Compute stats
    const totalMembers = members?.length || 0;
    const proMembers = members?.filter((m) => m.plan === "pro" && m.status === "active").length || 0;
    const premiumMembers = members?.filter((m) => m.plan === "premium" && m.status === "active").length || 0;
    const freeMembers = totalMembers - proMembers - premiumMembers;

    // Compute monthly revenue (last 30 days success transactions)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSuccessPayments = payments?.filter(
      (p) => p.status === "success" && new Date(p.created_at) >= thirtyDaysAgo
    ) || [];
    
    const monthlyRevenue = recentSuccessPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      members: members || [],
      payments: payments || [],
      stats: {
        totalMembers,
        proMembers,
        premiumMembers,
        freeMembers,
        monthlyRevenue,
      },
    });
  } catch (error: any) {
    console.error("Admin Membership GET Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load admin data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, action, plan, durationMonths } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: "Thiếu thông tin yêu cầu" }, { status: 400 });
    }

    if (action === "update_tier") {
      if (!plan) return NextResponse.json({ error: "Thiếu gói cần cập nhật" }, { status: 400 });

      let expiredAt: string | null = null;
      if (plan !== "free") {
        const date = new Date();
        date.setMonth(date.setMonth(date.getMonth() + (durationMonths || 1)));
        expiredAt = date.toISOString();
      }

      // Upsert membership
      const { data: membership, error: err } = await supabaseAdmin
        .from("memberships")
        .upsert({
          user_id: userId,
          plan,
          status: plan === "free" ? "none" : "active",
          start_date: new Date().toISOString(),
          expired_at: expiredAt,
          provider: "admin_console",
          subscription_id: `admin_man_${Date.now()}`,
        })
        .select("*")
        .single();

      if (err) throw err;

      // Log action
      await supabaseAdmin.from("subscription_logs").insert({
        user_id: userId,
        action: `admin_force_${plan}`,
        details: { plan, durationMonths, expiredAt },
      });

      return NextResponse.json({ success: true, membership });
    }

    if (action === "extend") {
      // Find current membership
      const { data: mem } = await supabaseAdmin
        .from("memberships")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const baseDate = mem?.expired_at ? new Date(mem.expired_at) : new Date();
      if (baseDate < new Date()) {
        // If already expired, start from today
        baseDate.setTime(Date.now());
      }
      baseDate.setMonth(baseDate.getMonth() + (durationMonths || 1));

      const { data: membership, error: err } = await supabaseAdmin
        .from("memberships")
        .update({
          status: "active",
          expired_at: baseDate.toISOString(),
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
    console.error("Admin Membership POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update membership" }, { status: 500 });
  }
}
