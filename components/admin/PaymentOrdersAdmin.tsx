import React, { useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { UserAvatar } from "@/components/common/UserAvatar";

interface OrderItem {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  order_code: string;
  transfer_content: string;
  created_at: string;
  paid_at: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface Props {
  orders: OrderItem[];
  onRefresh: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function PaymentOrdersAdmin({ orders, onRefresh, showToast }: Props) {
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleAction = async (orderId: string, action: "approve_order" | "decline_order" | "cancel_order") => {
    if (!confirm(`Bạn có chắc chắn muốn thực hiện hành động này trên đơn hàng không?`)) {
      return;
    }
    setSubmitting(orderId);
    try {
      const res = await fetch("/api/admin/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action })
      });
      if (res.ok) {
        showToast("Xử lý đơn hàng thành công.", "success");
        onRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || "Thao tác thất bại.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSubmitting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: "#fff8e8", color: "#e9a116", label: "Chờ thanh toán" },
      pending_verification: { bg: "#e6f7ff", color: "#1890ff", label: "Chờ duyệt (Đã CK)" },
      paid: { bg: "#e9f9f4", color: "#20aa7e", label: "Đã thanh toán" },
      failed: { bg: "#fff0f1", color: "#e53e3e", label: "Thất bại" },
      canceled: { bg: "#f1f5f9", color: "#64748b", label: "Đã hủy" },
      expired: { bg: "#f1f5f9", color: "#64748b", label: "Hết hạn" }
    };
    const b = badges[status] || { bg: "#f1f5f9", color: "#64748b", label: status };
    return (
      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", background: b.bg, color: b.color, display: "inline-block" }}>
        {b.label}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", margin: 0, fontWeight: "800" }}>Quản lý Đơn hàng Thanh toán</h2>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0 0" }}>
            Duyệt các giao dịch chuyển khoản ngân hàng thủ công qua VietQR hoặc theo dõi trạng thái từ Stripe.
          </p>
        </div>
        <button className="button button-secondary" onClick={onRefresh} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      <div style={{ overflowX: "auto", background: "white", border: "1px solid var(--line)", borderRadius: "12px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", background: "#f8fafc", color: "var(--muted)" }}>
              <th style={{ padding: "12px 16px" }}>Mã đơn & Ngày tạo</th>
              <th style={{ padding: "12px 16px" }}>Người mua</th>
              <th style={{ padding: "12px 16px" }}>Nội dung CK</th>
              <th style={{ padding: "12px 16px" }}>Gói & Số tiền</th>
              <th style={{ padding: "12px 16px" }}>Trạng thái</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                  Chưa có đơn thanh toán nào được tạo trên hệ thống.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid var(--line)", background: o.status === "pending_verification" ? "rgba(24, 144, 255, 0.03)" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <strong style={{ display: "block" }}>{o.order_code}</strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {new Date(o.created_at).toLocaleString("vi-VN")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <UserAvatar avatarUrl={o.profiles?.avatar_url} fullName={o.profiles?.full_name} email={o.profiles?.email} size={28} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: "bold" }}>{o.profiles?.full_name || "Chưa thiết lập"}</span>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{o.profiles?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", color: "#0f172a" }}>
                      {o.transfer_content}
                    </code>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <strong style={{ display: "block", textTransform: "uppercase" }}>{o.plan_id.replace("_", " ")}</strong>
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>
                      {Number(o.amount).toLocaleString("vi-VN")} {o.currency}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {getStatusBadge(o.status)}
                    <span style={{ display: "block", fontSize: "10px", color: "var(--muted)", textTransform: "capitalize", marginTop: "2px" }}>
                      Cổng: {o.provider}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {(o.status === "pending" || o.status === "pending_verification") ? (
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button 
                          className="button button-primary"
                          style={{ padding: "4px 8px", fontSize: "11px", height: "auto" }}
                          onClick={() => handleAction(o.id, "approve_order")}
                          disabled={submitting === o.id}
                        >
                          <Check size={12} /> Duyệt
                        </button>
                        <button 
                          className="button"
                          style={{ padding: "4px 8px", fontSize: "11px", height: "auto", background: "#fff5f5", color: "#ef4444", border: "1px solid #ffe4e6" }}
                          onClick={() => handleAction(o.id, "decline_order")}
                          disabled={submitting === o.id}
                        >
                          <X size={12} /> Từ chối
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default PaymentOrdersAdmin;
