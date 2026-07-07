"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Search, Crown, Star, RefreshCw, Calendar, ShieldAlert, Sparkles, User, BadgeAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/common/UserAvatar";

export default function MembershipAdmin() {
  const { showToast } = useAuth();
  const [data, setData] = useState<any>({ members: [], payments: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/membership");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast("Không thể tải danh sách thành viên", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleUpdateTier = async (userId: string, plan: "free" | "pro" | "premium", durationMonths = 1) => {
    try {
      const res = await fetch("/api/admin/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "update_tier", plan, durationMonths }),
      });
      if (res.ok) {
        showToast(`Đã chuyển đổi gói của người dùng thành công`, "success");
        startTransition(async () => {
          await fetchData();
        });
      } else {
        showToast("Thay đổi thất bại", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối", "error");
    }
  };

  const handleExtend = async (userId: string, durationMonths = 1) => {
    try {
      const res = await fetch("/api/admin/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "extend", durationMonths }),
      });
      if (res.ok) {
        showToast(`Đã gia hạn thành viên thêm ${durationMonths} tháng`, "success");
        startTransition(async () => {
          await fetchData();
        });
      } else {
        showToast("Gia hạn thất bại", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối", "error");
    }
  };

  const filteredMembers = data.members.filter((m: any) => {
    const profile = m.profiles || {};
    const name = profile.full_name || "";
    const email = profile.email || "";
    const text = `${name} ${email} ${m.plan}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const stats = data.stats || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Overview Stats */}
      <section className="admin-summary">
        <div>
          <span>TỔNG THÀNH VIÊN</span>
          <strong>{stats.totalMembers ?? 0}</strong>
          <small>Đồng bộ database</small>
        </div>
        <div>
          <span>THÀNH VIÊN PRO ⭐</span>
          <strong style={{ color: "#e9a116" }}>{stats.proMembers ?? 0}</strong>
          <small>Đang hoạt động</small>
        </div>
        <div>
          <span>DOANH THU (30 ngày)</span>
          <strong style={{ color: "#20aa7e" }}>
            {Number(stats.monthlyRevenue ?? 0).toLocaleString("vi-VN")}đ
          </strong>
          <small>Cổng Stripe & Sandbox</small>
        </div>
        <div>
          <span>MEMBER FREE</span>
          <strong style={{ color: "#64748b" }}>{stats.freeMembers ?? 0}</strong>
          <small>Gói mặc định</small>
        </div>
      </section>

      {/* Toolbar */}
      <section className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
        <div className="search-box" style={{ flex: 1, maxWidth: "400px" }}>
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên, email, gói..."
          />
        </div>
        <button className="button button-secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} /> Tải lại dữ liệu
        </button>
      </section>

      {/* Members Management Table */}
      <section className="admin-table-card">
        <div className="admin-table-head">
          <div>
            <h2>Quản lý Gói Thành Viên</h2>
            <p>Hiển thị {filteredMembers.length} thành viên đăng ký</p>
          </div>
        </div>

        <div className="admin-table">
          <div className="admin-row header" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1.2fr 1.5fr" }}>
            <span>THÀNH VIÊN</span>
            <span>GÓI</span>
            <span>TRẠNG THÁI</span>
            <span>HẠN SỬ DỤNG</span>
            <span style={{ textAlign: "right" }}>THAO TÁC</span>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
              Đang tải danh sách thành viên...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
              Không tìm thấy thành viên nào.
            </div>
          ) : (
            filteredMembers.map((m: any) => {
              const profile = m.profiles || {};
              return (
                <div key={m.id} className="admin-row" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1.2fr 1.5fr", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <UserAvatar avatarUrl={profile.avatar_url} fullName={profile.full_name} email={profile.email} size={28} />
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <strong style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.full_name || "Chưa thiết lập"}</strong>
                      <small style={{ fontSize: "10px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.email || "Không có email"}</small>
                    </div>
                  </div>

                  <div>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      background: m.plan === "free" ? "#f1f5f9" : m.plan === "pro" ? "#fff6e5" : "#f2efff",
                      color: m.plan === "free" ? "#64748b" : m.plan === "pro" ? "#e9a116" : "#8768f8"
                    }}>
                      {m.plan}
                    </span>
                  </div>

                  <div>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "8px",
                      fontSize: "9.5px",
                      background: m.status === "active" ? "#e9f9f3" : "#fff0f1",
                      color: m.status === "active" ? "#20aa7e" : "#e53e3e"
                    }}>
                      {m.status === "active" ? "Đang hoạt động" : "Hết hạn/Hủy"}
                    </span>
                  </div>

                  <div style={{ fontSize: "11.5px", color: "var(--ink)" }}>
                    {m.expired_at ? new Date(m.expired_at).toLocaleDateString("vi-VN") : "Vô hạn"}
                  </div>

                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    {m.plan === "free" ? (
                      <button
                        className="button button-secondary"
                        style={{ padding: "4px 8px", fontSize: "10px" }}
                        onClick={() => handleUpdateTier(m.user_id, "pro", 1)}
                      >
                        Lên PRO (1T)
                      </button>
                    ) : (
                      <>
                        <button
                          className="button button-secondary"
                          style={{ padding: "4px 8px", fontSize: "10px" }}
                          onClick={() => handleExtend(m.user_id, 1)}
                        >
                          +1 Tháng
                        </button>
                        <button
                          className="button"
                          style={{ padding: "4px 8px", fontSize: "10px", background: "#f1f5f9", color: "#64748b" }}
                          onClick={() => handleUpdateTier(m.user_id, "free")}
                        >
                          Hạ Free
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Recent Transaction Auditing */}
      <section className="admin-table-card">
        <div className="admin-table-head">
          <div>
            <h2>Lịch sử Giao dịch Gần đây</h2>
            <p>Danh sách các lượt thanh toán thành công hoặc đang chờ xử lý</p>
          </div>
        </div>

        <div className="admin-table">
          <div className="admin-row header" style={{ gridTemplateColumns: "1.2fr 1.5fr 1fr 1fr 1fr" }}>
            <span>KHÁCH HÀNG</span>
            <span>MÃ GIAO DỊCH</span>
            <span>CỔNG</span>
            <span>SỐ TIỀN</span>
            <span>TRẠNG THÁI</span>
          </div>

          {loading ? (
            <div style={{ padding: "30px", textAlign: "center" }}>Đang tải...</div>
          ) : data.payments.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>Chưa ghi nhận giao dịch nào.</div>
          ) : (
            data.payments.slice(0, 10).map((p: any) => {
              const u = p.profiles || {};
              return (
                <div key={p.id} className="admin-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 1fr 1fr 1fr", fontSize: "12px" }}>
                  <div>
                    <strong>{u.full_name || "Learner"}</strong>
                    <small style={{ color: "var(--muted)", display: "block" }}>{u.email}</small>
                  </div>
                  <div>
                    <code style={{ background: "#edf2f7", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>{p.transaction_id || "Không có"}</code>
                  </div>
                  <div style={{ textTransform: "uppercase" }}>{p.provider}</div>
                  <div style={{ fontWeight: "bold" }}>{Number(p.amount).toLocaleString("vi-VN")} {p.currency}</div>
                  <div>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "8px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      background: p.status === "success" ? "#e9f9f4" : p.status === "pending" ? "#fff8e8" : "#fff0f1",
                      color: p.status === "success" ? "#20aa7e" : p.status === "pending" ? "#e9a116" : "#e53e3e"
                    }}>
                      {p.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
