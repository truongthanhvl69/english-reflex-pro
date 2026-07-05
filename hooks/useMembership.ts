"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

export interface MembershipDetails {
  plan: "free" | "pro" | "premium";
  dailyLimit: number;
  dailyAnswersUsed: number;
  isLimitReached: boolean;
  loading: boolean;
}

export function useMembership() {
  const { profile, user } = useAuth();
  const [dailyAnswersUsed, setDailyAnswersUsed] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [isPending, startTransition] = useTransition();

  const plan = (profile?.subscription_tier as "free" | "pro" | "premium") || "free";
  const dailyLimit = 50; // 50 sentences per day for Free tier
  const isLimitReached = plan === "free" && dailyAnswersUsed >= dailyLimit;

  const fetchDailyCount = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCount(true);
    try {
      // Calculate start of today in local timezone represented in ISO format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();

      const { count, error } = await supabase
        .from("user_sentence_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfToday);

      if (!error && count !== null) {
        setDailyAnswersUsed(count);
      }
    } catch (e) {
      console.error("Error fetching daily answer count:", e);
    } finally {
      setLoadingCount(false);
    }
  }, [user?.id]);

  useEffect(() => {
    startTransition(() => {
      void fetchDailyCount();
    });

    // Listen for custom answer completed events to dynamically increment client-side counter
    const handleAnswerRecorded = () => {
      setDailyAnswersUsed((prev) => prev + 1);
    };

    window.addEventListener("sentence_answer_recorded", handleAnswerRecorded);
    return () => window.removeEventListener("sentence_answer_recorded", handleAnswerRecorded);
  }, [fetchDailyCount]);

  /**
   * Checks if user has permission to access a feature.
   * If they are FREE and the feature is premium, triggers the global upgrade modal.
   */
  const checkFeatureAccess = useCallback((feature: "speaking" | "ai-feedback" | "smart-review"): boolean => {
    if (plan === "pro" || plan === "premium") return true;

    // Trigger upgrade modal event
    let reason = "Trải nghiệm tính năng PRO";
    if (feature === "speaking") {
      reason = "Luyện phát âm chuẩn bản xứ với AI Speaking. Hãy nâng cấp lên PRO.";
    } else if (feature === "ai-feedback") {
      reason = "Nhận phản hồi chi tiết & giải thích ngữ pháp từ AI. Hãy nâng cấp lên PRO.";
    } else if (feature === "smart-review") {
      reason = "Mở khóa chế độ Ôn tập thông minh (Spaced Repetition). Hãy nâng cấp lên PRO.";
    }

    window.dispatchEvent(new CustomEvent("open_upgrade_modal", { detail: { reason } }));
    return false;
  }, [plan]);

  const triggerLimitModal = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("open_upgrade_modal", {
        detail: {
          reason: `Bạn đã đạt giới hạn học miễn phí hôm nay (${dailyLimit}/${dailyLimit} câu). Hãy nâng cấp PRO để học không giới hạn!`,
        },
      })
    );
  }, []);

  return {
    plan,
    dailyLimit,
    dailyAnswersUsed,
    isLimitReached,
    loading: loadingCount || isPending,
    checkFeatureAccess,
    triggerLimitModal,
    refreshCount: fetchDailyCount,
  };
}
