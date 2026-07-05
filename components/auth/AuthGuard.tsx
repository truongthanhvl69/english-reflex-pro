"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, LoaderCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return (
      <div className="auth-loading-screen">
        <div className="brand-mark"><GraduationCap size={25} /></div>
        <LoaderCircle className="spin" size={24} />
        <span>Đang đồng bộ tài khoản…</span>
      </div>
    );
  }

  return <>{children}</>;
}
