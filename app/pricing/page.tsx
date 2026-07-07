"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, X, ArrowLeft, ShieldAlert, Sparkles, Star, Crown, Info, Zap, Clock, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabaseClient";

interface BankTransferConfig {
  enabled: boolean;
  bank_name: string;
  account_no: string;
  account_name: string;
  branch?: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { profile, user, showToast } = useAuth();
  const { startCheckout, loading } = useSubscription();

  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "bank_transfer" | "mock">("bank_transfer");

  // Dynamic settings from database
  const [pricing, setPricing] = useState({
    pro_monthly: 99000,
    pro_yearly: 948000,
    basic_monthly: 49000,
    lifetime: 1999000
  });

  const [bankInfo, setBankInfo] = useState<BankTransferConfig>({
    enabled: true,
    bank_name: "Techcombank",
    account_no: "19036789999018",
    account_name: "TRAN VAN TRUONG"
  });

  const [isDev, setIsDev] = useState(false);
  const [orderModal, setOrderModal] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins default
  const [verifying, setVerifying] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentTier = profile?.membership_type || "free";

  // Check if development environment to show Sandbox Mock option
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      setIsDev(isLocal || process.env.NODE_ENV === "development");
      if (!isLocal && process.env.NODE_ENV !== "development") {
        setSelectedProvider("bank_transfer"); // Default to Bank Transfer in production
      }
    }
  }, []);

  // Fetch real-time payment settings (prices & bank info)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from("payment_settings").select("*");
        if (data) {
          const pricingRow = data.find((r) => r.key === "plans_pricing");
          if (pricingRow?.value) setPricing(pricingRow.value);

          const bankRow = data.find((r) => r.key === "bank_transfer");
          if (bankRow?.value) setBankInfo(bankRow.value);
        }
      } catch (e) {
        console.error("Error loading payment settings:", e);
      }
    };
    void fetchSettings();
  }, []);

  // Modal Countdown Timer logic
  useEffect(() => {
    if (!orderModal) return;

    setTimeLeft(900); // Reset to 15 mins
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto mark order as expired
          supabase
            .from("payment_orders")
            .update({ status: "expired" })
            .eq("id", orderModal.id)
            .then(() => {
              showToast("Đơn hàng chuyển khoản đã hết hạn.", "error");
              setOrderModal(null);
            });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderModal, showToast]);

  // Poll payment confirmation
  useEffect(() => {
    if (!orderModal) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: orderModal.id })
        });
        if (res.ok) {
          const { status } = await res.json();
          if (status === "paid") {
            showToast("Thanh toán thành công! Tài khoản của bạn đã được nâng cấp.", "success");
            setOrderModal(null);
            router.push("/profile");
          }
        }
      } catch (e) {
        console.warn("Polling order verify error:", e);
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [orderModal, router, showToast]);

  const handleStartCheckout = async (planId: "pro_monthly" | "pro_yearly" | "basic_monthly" | "lifetime") => {
    if (!user?.id) {
      showToast("Vui lòng đăng nhập để thực hiện thanh toán.", "error");
      router.push("/login");
      return;
    }

    // Handled custom bank transfer overlay
    if (selectedProvider === "bank_transfer") {
      setVerifying(true);
      try {
        const response = await fetch("/api/payment/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, planId, provider: "bank_transfer" }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Giao dịch thất bại");
        }

        const { order } = await response.json();
        setOrderModal(order);
      } catch (err: any) {
        showToast(err.message || "Lỗi khởi tạo đơn hàng chuyển khoản.", "error");
      } finally {
        setVerifying(false);
      }
    } else {
      // Call default hook for Stripe or Sandbox
      await startCheckout(planId as any, selectedProvider as any);
    }
  };

  const handleConfirmSent = async () => {
    if (!orderModal) return;
    setVerifying(true);
    try {
      const { error } = await supabase
        .from("payment_orders")
        .update({ status: "pending_verification" })
        .eq("id", orderModal.id);

      if (error) throw error;

      showToast("Đã gửi yêu cầu xác minh. Hệ thống đang tiến hành đối soát.", "success");
      setOrderModal({ ...orderModal, status: "pending_verification" });
    } catch (e) {
      showToast("Gặp lỗi khi gửi yêu cầu xác nhận.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const plans = [
    {
      id: "free",
      name: "FREE",
      description: "Luyện phản xạ cơ bản mỗi ngày",
      price: "0đ",
      period: "",
      accent: "slate",
      icon: Star,
      features: [
        { text: "50 câu phản xạ / ngày", status: true },
        { text: "Chế độ Gõ phản xạ (Typing)", status: true },
        { text: "Chế độ Ghép từ (Word Bank)", status: true },
        { text: "Chế độ Luyện nghe (Listening)", status: true },
        { text: "Luyện phát âm AI (Speaking)", status: false },
        { text: "AI Phân tích lỗi sai & gợi ý ngữ pháp", status: false },
      ],
      actionText: "Đang sử dụng",
      disabled: true,
    },
    {
      id: "basic",
      name: "BASIC",
      description: "Thêm gói câu và bài học mở rộng",
      price: `${pricing.basic_monthly.toLocaleString("vi-VN")}đ`,
      period: "/ tháng",
      accent: "blue",
      icon: Zap,
      features: [
        { text: "150 câu phản xạ / ngày", status: true },
        { text: "Chế độ Gõ, Ghép từ & Nghe chép", status: true },
        { text: "Báo cáo tiến độ học chi tiết", status: true },
        { text: "Luyện phát âm AI (Speaking)", status: false },
        { text: "AI Phân tích lỗi sai & gợi ý ngữ pháp", status: false },
      ],
      actionText: currentTier === "basic" ? "Gói của bạn" : "Đăng ký Basic",
      disabled: currentTier === "basic" || currentTier === "pro" || currentTier === "premium",
      checkoutPlan: "basic_monthly" as const
    },
    {
      id: "pro",
      name: "PRO",
      description: "Mở khóa toàn bộ sức mạnh phản xạ",
      price: activeTab === "monthly" 
        ? `${pricing.pro_monthly.toLocaleString("vi-VN")}đ` 
        : `${(pricing.pro_yearly / 12).toLocaleString("vi-VN")}đ`,
      period: activeTab === "monthly" ? "/ tháng" : "/ tháng (thanh toán năm)",
      accent: "gold",
      icon: Zap,
      popular: true,
      features: [
        { text: "Luyện tập không giới hạn số câu", status: true },
        { text: "Mở khóa toàn bộ 100+ bài học", status: true },
        { text: "Luyện phát âm AI (Speaking)", status: true },
        { text: "AI Phân tích lỗi sai & gợi ý ngữ pháp", status: true },
        { text: "Giọng đọc Google Cloud AI Premium", status: true },
        { text: "Học ôn tập thông minh (Spaced Repetition)", status: true },
      ],
      actionText: currentTier === "pro" ? "Gói của bạn" : "Đăng ký PRO",
      disabled: currentTier === "pro" || currentTier === "premium",
      checkoutPlan: activeTab === "monthly" ? ("pro_monthly" as const) : ("pro_yearly" as const)
    },
    {
      id: "lifetime",
      name: "LIFETIME",
      description: "Sở hữu vĩnh viễn, học trọn đời",
      price: `${pricing.lifetime.toLocaleString("vi-VN")}đ`,
      period: "/ một lần duy nhất",
      accent: "purple",
      icon: Crown,
      features: [
        { text: "Toàn bộ quyền lợi của gói PRO", status: true },
        { text: "Sử dụng vĩnh viễn, không phí duy trì", status: true },
        { text: "Cập nhật miễn phí tính năng mới", status: true },
        { text: "Hỗ trợ riêng đặc quyền 24/7", status: true },
      ],
      actionText: currentTier === "lifetime" ? "Gói của bạn" : "Mua Trọn Đời",
      disabled: currentTier === "lifetime",
      checkoutPlan: "lifetime" as const
    },
  ];

  // Helper format countdown timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="pricing-page-wrapper">
      <div className="pricing-header-bar">
        <button className="pricing-back-btn" onClick={() => router.push("/")}>
          <ArrowLeft size={16} /> Quay lại học
        </button>
        <span className="pricing-logo-text">English Reflex <b>PRO</b></span>
      </div>

      <div className="pricing-container">
        <div className="pricing-intro">
          <span className="eyebrow-accent"><Sparkles size={14} /> TIẾT KIỆM ĐẾN 20% CHU KỲ NĂM</span>
          <h1>Nâng Tầm Phản Xạ Tiếng Anh</h1>
          <p>Mở khóa các tính năng AI chuyên sâu và luyện tập không giới hạn để làm chủ phản xạ tự nhiên.</p>

          <div className="billing-switcher">
            <button className={activeTab === "monthly" ? "active" : ""} onClick={() => setActiveTab("monthly")}>
              Tháng
            </button>
            <button className={activeTab === "yearly" ? "active" : ""} onClick={() => setActiveTab("yearly")}>
              Năm <span className="discount-tag">-20%</span>
            </button>
          </div>

          <div className="gateway-selector-wrap">
            <span><Info size={14} /> Chọn phương thức thanh toán:</span>
            <div className="gateway-options">
              <label className={selectedProvider === "bank_transfer" ? "selected" : ""}>
                <input
                  type="radio"
                  name="provider"
                  value="bank_transfer"
                  checked={selectedProvider === "bank_transfer"}
                  onChange={() => setSelectedProvider("bank_transfer")}
                />
                🏦 Chuyển khoản ngân hàng / VietQR (Nhanh chóng)
              </label>
              <label className={selectedProvider === "stripe" ? "selected" : ""}>
                <input
                  type="radio"
                  name="provider"
                  value="stripe"
                  checked={selectedProvider === "stripe"}
                  onChange={() => setSelectedProvider("stripe")}
                />
                💳 Cổng Stripe (Visa / Mastercard)
              </label>
              {isDev && (
                <label className={selectedProvider === "mock" ? "selected" : ""} style={{ borderColor: "#ea580c", background: "#fff7ed" }}>
                  <input
                    type="radio"
                    name="provider"
                    value="mock"
                    checked={selectedProvider === "mock"}
                    onChange={() => setSelectedProvider("mock")}
                  />
                  🛠️ Sandbox Mock (Chỉ nhà phát triển thấy)
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="pricing-grid-cards">
          {plans.map((plan) => {
            const PlanIcon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`pricing-card ${plan.accent} ${plan.popular ? "featured" : ""} ${
                  currentTier === plan.id ? "current-tier" : ""
                }`}
              >
                {plan.popular && <span className="popular-badge">PHỔ BIẾN NHẤT 🔥</span>}
                <div className="card-top-section">
                  <div className="card-icon-circle">
                    <PlanIcon size={22} />
                  </div>
                  <h3>{plan.name}</h3>
                  <p className="plan-desc">{plan.description}</p>
                  <div className="price-tag-row">
                    <span className="price-val">{plan.price}</span>
                    <span className="price-period">{plan.period}</span>
                  </div>
                </div>

                <button
                  className={`plan-action-btn ${plan.popular ? "btn-primary" : "btn-secondary"}`}
                  disabled={plan.disabled || loading || verifying}
                  onClick={() => {
                    if (plan.checkoutPlan) {
                      void handleStartCheckout(plan.checkoutPlan);
                    }
                  }}
                >
                  {loading || verifying ? "Đang xử lý..." : plan.actionText}
                </button>

                <ul className="plan-feature-list">
                  {plan.features.map((feature, i) => (
                    <li key={i} className={feature.status ? "active" : "disabled"}>
                      {feature.status ? (
                        <Check size={16} className="feat-check" />
                      ) : (
                        <X size={16} className="feat-x" />
                      )}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="pricing-disclaimer">
          <ShieldAlert size={16} />
          <span>Thanh toán thực tế, bảo mật và mã hóa 256-bit. Giao dịch chuyển khoản được xác minh tự động hoặc thông qua ban quản trị trong vòng 10 phút.</span>
        </div>
      </div>

      {/* MODAL: VietQR Bank Transfer Countdown details */}
      {orderModal && (
        <div className="avatar-cropper-modal" style={{ backdropFilter: "blur(4px)" }}>
          <div className="avatar-cropper-content" style={{ maxWidth: "460px", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)", margin: 0 }}>Chuyển khoản Ngân hàng / VietQR</h2>
              <button 
                onClick={() => setOrderModal(null)} 
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}
                disabled={verifying}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              {/* Countdown Alert */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fef2f2", border: "1px solid #fee2e2", padding: "10px 14px", borderRadius: "10px" }}>
                <Clock size={16} style={{ color: "#ef4444" }} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#b91c1c" }}>
                  Đơn hàng hết hạn sau: <strong style={{ fontFamily: "monospace" }}>{formatTime(timeLeft)}</strong>
                </span>
              </div>

              {/* QR Image */}
              {orderModal.qr_url && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <img 
                    src={orderModal.qr_url} 
                    alt="VietQR code" 
                    style={{ width: "220px", height: "220px", borderRadius: "8px" }} 
                  />
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                    <QrCode size={13} /> Quét mã QR bằng ứng dụng ngân hàng của bạn
                  </span>
                </div>
              )}

              {/* Bank accounts text info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineBreak: "anywhere" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--muted)" }}>Tên gói đăng ký:</span>
                  <strong style={{ textTransform: "uppercase" }}>{orderModal.plan_id.replace("_", " ")}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--muted)" }}>Số tiền chuyển khoản:</span>
                  <strong style={{ color: "#ef4444", fontSize: "15px" }}>{Number(orderModal.amount).toLocaleString("vi-VN")} VND</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--muted)" }}>Ngân hàng:</span>
                  <strong>{bankInfo.bank_name}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--muted)" }}>Số tài khoản nhận:</span>
                  <strong style={{ fontSize: "14px" }}>{bankInfo.account_no}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--muted)" }}>Tên người thụ hưởng:</span>
                  <strong>{bankInfo.account_name}</strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#fcf8e3", border: "1px solid #faebcc", padding: "10px", borderRadius: "8px" }}>
                  <span style={{ color: "#8a6d3b", fontWeight: "600" }}>Nội dung chuyển khoản (Bắt buộc chính xác):</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <code style={{ fontSize: "16px", color: "#c7254e", fontWeight: "bold", background: "#f9f2f4", padding: "4px 8px", borderRadius: "4px" }}>
                      {orderModal.transfer_content}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(orderModal.transfer_content);
                        showToast("Đã sao chép nội dung chuyển khoản.", "success");
                      }}
                      style={{ fontSize: "11px", fontWeight: "bold", color: "#31708f", background: "#d9edf7", border: "1px solid #bce8f1", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px" }}>
              {orderModal.status === "pending_verification" ? (
                <div style={{ width: "100%", textAlign: "center", background: "#d9edf7", color: "#31708f", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600" }}>
                  ⏳ Đang kiểm tra giao dịch... Hệ thống sẽ kích hoạt ngay khi nhận được tiền.
                </div>
              ) : (
                <>
                  <button 
                    className="button"
                    onClick={() => {
                      supabase
                        .from("payment_orders")
                        .update({ status: "canceled" })
                        .eq("id", orderModal.id)
                        .then(() => {
                          showToast("Đã hủy đơn hàng thanh toán.", "info");
                          setOrderModal(null);
                        });
                    }}
                    disabled={verifying}
                  >
                    Hủy đơn hàng
                  </button>
                  <button 
                    className="button button-primary"
                    onClick={handleConfirmSent}
                    disabled={verifying}
                  >
                    Tôi đã chuyển khoản
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
