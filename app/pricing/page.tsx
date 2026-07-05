"use client";

import React, { useState } from "react";
import { Check, X, ArrowLeft, ShieldAlert, Sparkles, Star, Crown, Info, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export default function PricingPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { startCheckout, loading } = useSubscription();
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "mock">("mock");

  const currentTier = profile?.subscription_tier || "free";

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
        { text: "Học ôn tập thông minh (Spaced Repetition)", status: false },
      ],
      actionText: "Đang sử dụng",
      disabled: true,
    },
    {
      id: "pro",
      name: "PRO",
      description: "Mở khóa toàn bộ sức mạnh phản xạ",
      price: activeTab === "monthly" ? "99.000đ" : "79.000đ",
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
        { text: "Đồng bộ tiến độ trên nhiều thiết bị", status: true },
        { text: "Hoàn toàn không có quảng cáo", status: true },
      ],
      actionText: currentTier === "pro" ? "Gói của bạn" : "Nâng cấp ngay",
      disabled: currentTier === "pro" || currentTier === "premium",
    },
    {
      id: "premium",
      name: "PREMIUM",
      description: "Đồng hành 1-1 cùng huấn luyện viên AI",
      price: "Coming Soon",
      period: "",
      accent: "purple",
      icon: Crown,
      features: [
        { text: "Toàn bộ quyền lợi gói PRO", status: true },
        { text: "Lộ trình học cá nhân hóa 100% bằng AI", status: true },
        { text: "Huấn luyện viên phát âm AI chuyên sâu", status: true },
        { text: "Hỗ trợ riêng đặc quyền 24/7", status: true },
      ],
      actionText: "Sắp ra mắt",
      disabled: true,
    },
  ];

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
          <span className="eyebrow-accent"><Sparkles size={14} /> TIẾT KIỆM ĐẾN 20%</span>
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
            <span><Info size={14} /> Chọn phương thức thanh toán thử nghiệm:</span>
            <div className="gateway-options">
              <label className={selectedProvider === "mock" ? "selected" : ""}>
                <input
                  type="radio"
                  name="provider"
                  value="mock"
                  checked={selectedProvider === "mock"}
                  onChange={() => setSelectedProvider("mock")}
                />
                🏦 Giả lập Sandbox (Nhanh & An toàn)
              </label>
              <label className={selectedProvider === "stripe" ? "selected" : ""}>
                <input
                  type="radio"
                  name="provider"
                  value="stripe"
                  checked={selectedProvider === "stripe"}
                  onChange={() => setSelectedProvider("stripe")}
                />
                💳 Cổng Stripe (Production test)
              </label>
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
                  disabled={plan.disabled || loading}
                  onClick={() => {
                    if (plan.id === "pro") {
                      void startCheckout("pro", selectedProvider);
                    }
                  }}
                >
                  {loading && plan.id === "pro" ? "Đang xử lý..." : plan.actionText}
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
          <span>Thử nghiệm sandbox an toàn. Bạn có thể sử dụng gói Giả lập Sandbox để nâng cấp tài khoản PRO miễn phí ngay lập tức mà không cần điền thông tin thẻ ngân hàng thật.</span>
        </div>
      </div>
    </div>
  );
}
