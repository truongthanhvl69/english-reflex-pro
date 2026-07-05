"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpenCheck, Cloud, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useAuth } from "@/hooks/useAuth";

function RegisterContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next") || "/";
  const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, nextPath, router, user]);

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-brand"><GraduationCap size={28} /><strong>English Reflex <span>PRO</span></strong></div>
        <div className="login-showcase-copy">
          <span><Sparkles size={15} /> BẮT ĐẦU CHỈ TRONG 1 PHÚT</span>
          <h1>Tham gia lớp học.<br />Lưu trữ thành quả.</h1>
          <p>Tạo tài khoản học tập miễn phí để theo dõi tiến độ, tích lũy điểm EXP và rèn luyện phản xạ tiếng Anh mỗi ngày.</p>
        </div>
        <div className="login-benefits">
          <div><Cloud size={19} /><span><b>Lưu trữ đám mây</b><small>Dữ liệu học tập đồng bộ vĩnh viễn</small></span></div>
          <div><BookOpenCheck size={19} /><span><b>Tiến trình thông minh</b><small>Tự động ghi nhớ câu khó và sửa sai</small></span></div>
          <div><ShieldCheck size={19} /><span><b>Bảo mật tuyệt đối</b><small>Mật khẩu của bạn được mã hóa an toàn</small></span></div>
        </div>
      </section>

      <section className="login-panel">
        <RegisterForm nextPath={nextPath} />
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="auth-loading-screen">Đang tải…</div>}><RegisterContent /></Suspense>;
}
