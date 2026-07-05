"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkles, Star, Zap, Award, Mic2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export function UpgradeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setReason(customEvent.detail?.reason || "Mở khóa toàn bộ các tính năng đặc quyền dành cho PRO.");
      setOpen(true);
    };

    window.addEventListener("open_upgrade_modal", handleOpen);
    return () => window.removeEventListener("open_upgrade_modal", handleOpen);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="upgrade-modal-backdrop" onClick={() => setOpen(false)}>
        <motion.div
          className="upgrade-modal-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
        >
          <button className="upgrade-modal-close" onClick={() => setOpen(false)} aria-label="Đóng">
            <X size={20} />
          </button>

          <div className="upgrade-modal-banner">
            <div className="banner-glow-effect" />
            <div className="banner-icon-badge">
              <Zap size={24} fill="currentColor" />
            </div>
            <h2>⭐ English Reflex Pro</h2>
            <p>Mở khóa toàn bộ tính năng và học tập không giới hạn.</p>
          </div>

          <div className="upgrade-modal-content">
            {reason && (
              <div className="upgrade-reason-box">
                <p>{reason}</p>
              </div>
            )}

            <div className="upgrade-features-preview">
              <div className="preview-item">
                <span className="icon-wrap gold"><Zap size={16} fill="currentColor" /></span>
                <div>
                  <strong>Học không giới hạn</strong>
                  <p>Luyện tập bao nhiêu câu tùy thích, không lo giới hạn hằng ngày.</p>
                </div>
              </div>
              <div className="preview-item">
                <span className="icon-wrap pink"><Mic2 size={16} /></span>
                <div>
                  <strong>AI Speaking & Pronunciation</strong>
                  <p>Luyện phát âm chuẩn bản xứ và nhận đánh giá ngữ điệu tức thì.</p>
                </div>
              </div>
              <div className="preview-item">
                <span className="icon-wrap blue"><MessageSquare size={16} /></span>
                <div>
                  <strong>AI Phân tích lỗi & ngữ pháp</strong>
                  <p>Giải thích cặn kẽ mọi lỗi sai giúp bạn ghi nhớ sâu sắc.</p>
                </div>
              </div>
            </div>

            <div className="upgrade-modal-actions">
              <button
                className="upgrade-modal-action-btn primary"
                onClick={() => {
                  setOpen(false);
                  router.push("/pricing");
                }}
              >
                Nâng cấp ngay <Sparkles size={14} fill="currentColor" />
              </button>
              <button className="upgrade-modal-action-btn secondary" onClick={() => setOpen(false)}>
                Để sau
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
