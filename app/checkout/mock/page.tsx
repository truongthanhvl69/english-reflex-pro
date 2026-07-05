"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function MockCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast, refreshProfile } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [isPending, startTransition] = useTransition();

  const userId = searchParams.get("userId") || "";
  const plan = searchParams.get("plan") || "pro";
  const txnId = searchParams.get("txnId") || "";

  useEffect(() => {
    if (!userId || !txnId) {
      showToast("Thông tin giao dịch không hợp lệ.", "error");
      router.push("/pricing");
    }
  }, [userId, txnId, router, showToast]);

  const handleSimulateSuccess = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId: txnId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast("Giả lập thanh toán thành công!", "success");
          startTransition(async () => {
            await refreshProfile();
            router.push(`/checkout/success?plan=${plan}`);
          });
        } else {
          showToast(data.error || "Thanh toán thất bại.", "error");
        }
      } else {
        showToast("Lỗi hệ thống khi xác thực giao dịch.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối mạng.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateFailure = () => {
    showToast("Bạn đã hủy giao dịch thử nghiệm.", "info");
    router.push("/pricing");
  };

  return (
    <div className="mock-checkout-container">
      <div className="mock-checkout-card">
        <div className="mock-checkout-header">
          <div className="simulator-chip">
            <Sparkles size={12} /> CỔNG THỬ NGHIỆM SANDBOX
          </div>
          <h1>Giả Lập Thanh Toán</h1>
          <p>Mô phỏng quy trình xử lý thanh toán thực tế của hệ thống.</p>
        </div>

        <div className="transaction-detail-box">
          <div className="txn-row">
            <span>Sản phẩm:</span>
            <strong>English Reflex {plan.toUpperCase()}</strong>
          </div>
          <div className="txn-row">
            <span>Số tiền:</span>
            <strong className="amount-text">{plan === "pro" ? "99.000đ" : "199.000đ"}</strong>
          </div>
          <div className="txn-row">
            <span>Mã giao dịch:</span>
            <code className="txn-code">{txnId}</code>
          </div>
        </div>

        <div className="sandbox-info-alert">
          <ShieldCheck size={20} className="info-icon" />
          <div className="alert-copy">
            <strong>Chế độ thử nghiệm an toàn</strong>
            <p>Không có tiền thực tế nào bị trừ. Nhấn nút dưới đây để báo cho máy chủ xác nhận giao dịch thành công.</p>
          </div>
        </div>

        <div className="mock-checkout-actions">
          <button
            className="simulate-success-btn"
            disabled={verifying || isPending}
            onClick={handleSimulateSuccess}
          >
            {verifying || isPending ? (
              <>
                <Loader2 size={16} className="spin" /> Đang đồng bộ...
              </>
            ) : (
              "Thanh toán thành công (Simulate)"
            )}
          </button>
          <button
            className="simulate-failure-btn"
            disabled={verifying || isPending}
            onClick={handleSimulateFailure}
          >
            Hủy bỏ giao dịch
          </button>
        </div>

        <div className="mock-card-visual">
          <div className="card-top">
            <CreditCard size={28} />
            <span>SANDBOX CARD</span>
          </div>
          <div className="card-number">•••• •••• •••• 2026</div>
          <div className="card-bottom">
            <span>REFLEX TESTER</span>
            <span>12/29</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="mock-checkout-container">
        <div className="mock-checkout-card" style={{ padding: "40px", textAlign: "center" }}>
          <h2>Đang tải thông tin thanh toán...</h2>
        </div>
      </div>
    }>
      <MockCheckoutContent />
    </Suspense>
  );
}
