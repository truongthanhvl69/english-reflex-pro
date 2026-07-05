"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useSubscription() {
  const { user, showToast, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const startCheckout = useCallback(async (planId: "pro" | "premium", provider: "stripe" | "mock") => {
    if (!user?.id) {
      showToast("Vui lòng đăng nhập để nâng cấp tài khoản.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, planId, provider }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Giao dịch thất bại");
      }

      const { checkoutUrl } = await response.json();
      if (checkoutUrl) {
        // Redirect browser to checkout URL
        window.location.href = checkoutUrl;
      }
    } catch (e: any) {
      showToast(e.message || "Không thể khởi tạo thanh toán.", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.id, showToast]);

  const cancelSubscription = useCallback(async () => {
    if (!user?.id) return;
    if (!confirm("Bạn có chắc chắn muốn hủy gia hạn tự động của gói PRO không? Bạn vẫn sẽ giữ quyền lợi PRO cho đến hết chu kỳ hiện tại.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        showToast("Đã hủy tự động gia hạn thành công.", "success");
        await refreshProfile();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Hủy gia hạn thất bại.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối khi hủy gia hạn.", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.id, refreshProfile, showToast]);

  return {
    startCheckout,
    cancelSubscription,
    loading,
  };
}
