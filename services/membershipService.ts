import { supabaseAdmin, MembershipData } from "./paymentService";

export const MembershipService = {
  async getMembership(userId: string): Promise<MembershipData | null> {
    if (!userId) return null;
    const { data } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data as MembershipData;
  },

  async upgradeMembership(
    userId: string,
    plan: "basic" | "pro" | "premium" | "lifetime",
    durationMonths: number,
    provider: string,
    subscriptionId?: string
  ): Promise<MembershipData> {
    const startDate = new Date();
    let expiredAt: Date | null = new Date();
    
    if (plan === "lifetime") {
      expiredAt = null;
    } else {
      expiredAt.setMonth(expiredAt.getMonth() + durationMonths);
    }

    const { data: membership, error: memError } = await supabaseAdmin
      .from("memberships")
      .upsert({
        user_id: userId,
        membership_type: plan,
        status: "active",
        started_at: startDate.toISOString(),
        expired_at: expiredAt ? expiredAt.toISOString() : null,
        auto_renew: plan !== "lifetime",
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (memError) throw memError;

    // Trigger tier update in profiles table directly
    await supabaseAdmin
      .from("profiles")
      .update({ 
        membership_type: plan,
        subscription_tier: plan === "lifetime" ? "pro" : plan
      })
      .eq("id", userId);

    // Log subscription event
    await supabaseAdmin.from("subscription_logs").insert({
      user_id: userId,
      action: "upgrade",
      details: { plan, durationMonths, provider, subscriptionId, expiredAt: expiredAt ? expiredAt.toISOString() : "lifetime" },
    });

    return membership as any;
  },

  async cancelSubscription(userId: string): Promise<boolean> {
    const mem = await this.getMembership(userId);
    if (!mem || mem.membership_type === "free" || mem.status !== "active") return false;

    await supabaseAdmin
      .from("memberships")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    await supabaseAdmin.from("subscription_logs").insert({
      user_id: userId,
      action: "cancel_subscription",
      details: { provider: mem.provider, subscriptionId: mem.subscription_id },
    });

    return true;
  },

  async restorePurchase(userId: string): Promise<MembershipData | null> {
    const mem = await this.getMembership(userId);
    if (!mem || mem.membership_type === "free") return mem;

    if (mem.expired_at && new Date(mem.expired_at) < new Date()) {
      const { data } = await supabaseAdmin
        .from("memberships")
        .update({ membership_type: "free", status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("*")
        .single();
      
      await supabaseAdmin.from("subscription_logs").insert({
        user_id: userId,
        action: "expired",
        details: { oldPlan: mem.membership_type },
      });
      return data as any;
    }

    return mem;
  }
};
export default MembershipService;
