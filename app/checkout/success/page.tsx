"use client";

import React, { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, BookOpen, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Refresh the user's profile to make sure subscription status is fully in sync
    startTransition(async () => {
      await refreshProfile();
    });
  }, [refreshProfile]);

  return (
    <div className="success-page-container">
      <div className="success-card">
        <div className="fireworks-glow" />
        <div className="success-icon-wrap">
          <CheckCircle2 size={46} className="main-success-icon" />
          <Sparkles size={24} className="sparkle-one" />
          <Award size={20} className="sparkle-two" />
        </div>

        <span className="success-kicker">GIAO DỊCH THÀNH CÔNG 🎉</span>
        <h1>Chào mừng tới PRO!</h1>
        <p className="success-msg">
          Chúc mừng! Bạn đã nâng cấp thành công tài khoản lên gói **English Reflex PRO**. Tất cả các tính năng thông minh và kho bài học đã được mở khóa hoàn toàn cho bạn.
        </p>

        <div className="success-benefits-summary">
          <div>
            <b>✨ Quyền lợi PRO đã kích hoạt:</b>
          </div>
          <ul>
            <li>🚀 Luyện phản xạ không giới hạn số câu mỗi ngày</li>
            <li>🎙️ Luyện phát âm AI Speaking với phản hồi chi tiết</li>
            <li>💡 Giải thích lỗi sai & gợi ý cấu trúc ngữ pháp tự nhiên</li>
            <li>🔄 Hệ thống Ôn tập thông minh Spaced Repetition</li>
          </ul>
        </div>

        <div className="success-profile-snapshot">
          <span>Gói hiện tại:</span>
          <strong>⭐ PRO MEMBERSHIP</strong>
        </div>

        <div className="success-actions">
          <button
            className="success-dashboard-btn"
            disabled={isPending}
            onClick={() => router.push("/")}
          >
            Bắt đầu học ngay
          </button>
        </div>
      </div>
    </div>
  );
}
