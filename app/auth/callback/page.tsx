"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, LoaderCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function CallbackContent() {
  const { user, loading, showToast } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const requestedNext = searchParams.get("next") || "/";
  const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, nextPath, router, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!user) {
        setTimedOut(true);
        localStorage.removeItem("english_reflex_oauth_pending");
        showToast("Không thể đăng nhập. Vui lòng thử lại.", "error");
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [showToast, user]);

  useEffect(() => {
    if (timedOut) router.replace("/login");
  }, [router, timedOut]);

  return (
    <div className="auth-loading-screen">
      <div className="brand-mark"><GraduationCap size={25} /></div>
      <LoaderCircle className="spin" size={24} />
      <span>Đang hoàn tất đăng nhập Google…</span>
    </div>
  );
}

export default function AuthCallbackPage() {
  return <Suspense fallback={<div className="auth-loading-screen">Đang xác thực…</div>}><CallbackContent /></Suspense>;
}
