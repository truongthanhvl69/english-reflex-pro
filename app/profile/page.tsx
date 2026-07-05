"use client";

import { ArrowLeft, CheckCircle2, Flame, LogOut, ShieldCheck, Star, Target, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/hooks/useSubscription";

function ProfileContent() {
  const { profile, user, signOut } = useAuth();
  const { cancelSubscription, loading: subLoading } = useSubscription();
  const router = useRouter();
  
  const [membership, setMembership] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  const name = profile?.full_name || user?.user_metadata.name || "Learner";
  const currentTier = profile?.subscription_tier || "free";

  const fetchBillingData = async () => {
    if (!user?.id) return;
    setLoadingDb(true);
    try {
      const { data: mem } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const { data: pay } = await supabase
        .from("payment_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setMembership(mem);
      setPayments(pay || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    void fetchBillingData();
  }, [user?.id]);

  const handleCancelSub = async () => {
    await cancelSubscription();
    void fetchBillingData();
  };

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <button className="profile-back" onClick={() => router.push("/")}><ArrowLeft size={17} /> Quay lại học</button>
        
        <section className="profile-hero">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="profile-avatar-fallback">{name.slice(0, 1).toUpperCase()}</div>
          )}
          <div>
            <span className="eyebrow">HỒ SƠ CÁ NHÂN</span>
            <h1>Xin chào, {name}</h1>
            <p>{profile?.email || user?.email}</p>
          </div>
          <span className="account-plan">
            <ShieldCheck size={15} /> 
            Gói {currentTier === "premium" ? "Premium" : currentTier === "pro" ? "Pro ⭐" : "Miễn phí"}
          </span>
        </section>

        <section className="profile-stats">
          <div><Star size={21} /><span>Tổng EXP</span><strong>{(profile?.exp ?? 0).toLocaleString("vi-VN")}</strong></div>
          <div><Flame size={21} /><span>Streak</span><strong>{profile?.streak ?? 0} ngày</strong></div>
          <div><Target size={21} /><span>Accuracy</span><strong>{Number(profile?.accuracy ?? 0).toFixed(1)}%</strong></div>
          <div><Trophy size={21} /><span>Cấp độ</span><strong>Level {profile?.level ?? 1}</strong></div>
        </section>

        {/* Membership Details Section */}
        <section className="profile-details" style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "stretch", marginTop: "15px" }}>
          <div>
            <h2 style={{ fontSize: "16px", marginBottom: "14px" }}>Quản lý Gói Thành Viên</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "14px" }}>
              <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "12px", background: "var(--surface-soft)" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Gói dịch vụ</span>
                <strong style={{ fontSize: "14px", color: "var(--ink)", textTransform: "uppercase" }}>
                  {currentTier === "free" ? "Free Member" : `PRO MEMBER ${membership?.status === "canceled" ? "(Đã hủy gia hạn)" : ""}`}
                </strong>
              </div>
              <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "12px", background: "var(--surface-soft)" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Ngày bắt đầu</span>
                <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                  {membership?.start_date ? new Date(membership.start_date).toLocaleDateString("vi-VN") : "Không có"}
                </strong>
              </div>
              <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "12px", background: "var(--surface-soft)" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Hạn sử dụng</span>
                <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                  {membership?.expired_at ? new Date(membership.expired_at).toLocaleDateString("vi-VN") : "Vô hạn"}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
              {currentTier === "free" ? (
                <button className="button button-primary" onClick={() => router.push("/pricing")}>
                  🚀 Nâng cấp Pro ngay
                </button>
              ) : (
                <>
                  <button className="button button-secondary" onClick={() => router.push("/pricing")}>
                    Đổi gói / Gia hạn
                  </button>
                  {membership?.status === "active" && (
                    <button 
                      className="button" 
                      style={{ background: "#fff5f5", color: "#e53e3e", border: "1px solid #ffe3e3" }}
                      onClick={handleCancelSub}
                      disabled={subLoading}
                    >
                      {subLoading ? "Đang hủy..." : "Hủy tự động gia hạn"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Payment History Section */}
        <section className="profile-details" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "stretch", marginTop: "15px" }}>
          <div>
            <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>Lịch sử thanh toán</h2>
            {payments.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--muted)" }}>Chưa thực hiện giao dịch thanh toán nào.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                      <th style={{ padding: "10px 8px" }}>Ngày</th>
                      <th style={{ padding: "10px 8px" }}>Số tiền</th>
                      <th style={{ padding: "10px 8px" }}>Cổng thanh toán</th>
                      <th style={{ padding: "10px 8px" }}>Mã giao dịch</th>
                      <th style={{ padding: "10px 8px" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "10px 8px" }}>{new Date(p.created_at).toLocaleDateString("vi-VN")}</td>
                        <td style={{ padding: "10px 8px", fontWeight: "bold" }}>
                          {Number(p.amount).toLocaleString("vi-VN")} {p.currency}
                        </td>
                        <td style={{ padding: "10px 8px", textTransform: "capitalize" }}>{p.provider}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <code style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }}>
                            {p.transaction_id ? p.transaction_id.slice(0, 14) + "..." : "Không có"}
                          </code>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            background: p.status === "success" ? "#e9f9f4" : p.status === "pending" ? "#fff8e8" : "#fff0f1",
                            color: p.status === "success" ? "#20aa7e" : p.status === "pending" ? "#e9a116" : "#e53e3e"
                          }}>
                            {p.status === "success" ? "Thành công" : p.status === "pending" ? "Đang chờ" : "Đã hủy/Lỗi"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="profile-details" style={{ marginTop: "15px" }}>
          <div>
            <h2>Dữ liệu học tập</h2>
            <p><CheckCircle2 size={16} /> {profile?.correct_answers ?? 0} câu đúng trên {profile?.total_answers ?? 0} lượt trả lời</p>
            <p><CheckCircle2 size={16} /> Tiến trình, lịch sử và cài đặt âm thanh đang đồng bộ bằng Supabase</p>
          </div>
          <button className="profile-logout" onClick={() => void signOut()}><LogOut size={17} /> Đăng xuất</button>
        </section>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}
