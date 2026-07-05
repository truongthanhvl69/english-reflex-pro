"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpenCheck, Cloud, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/hooks/useAuth";

function LoginContent() {
  const { user, loading, signInWithMock } = useAuth();
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
          <span><Sparkles size={15} /> HỌC LIỀN MẠCH TRÊN MỌI THIẾT BỊ</span>
          <h1>Phản xạ tốt hơn.<br />Tiến bộ không bị mất.</h1>
          <p>Mọi câu trả lời, EXP và chuỗi ngày học đều được đồng bộ an toàn vào tài khoản của riêng bạn.</p>
        </div>
        <div className="login-benefits">
          <div><Cloud size={19} /><span><b>Đồng bộ tự động</b><small>Tiếp tục đúng nơi bạn dừng lại</small></span></div>
          <div><BookOpenCheck size={19} /><span><b>Lộ trình cá nhân</b><small>Lưu tiến độ và câu cần ôn</small></span></div>
          <div><ShieldCheck size={19} /><span><b>Dữ liệu riêng tư</b><small>Mỗi tài khoản một không gian học</small></span></div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-icon"><GraduationCap size={30} /></div>
          <span className="eyebrow">CHÀO MỪNG BẠN</span>
          <h2>Đăng nhập để tiếp tục</h2>
          <p>Dùng Gmail hoặc Google Account. Nếu đây là lần đầu, tài khoản học sẽ được tạo tự động.</p>
          
          <LoginButton nextPath={nextPath} label="Tiếp tục với Gmail" />
          
          <button 
            className="mock-login-button" 
            onClick={() => signInWithMock && signInWithMock()}
            style={{
              marginTop: "12px",
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              background: "var(--primary-soft)",
              border: "1px dashed var(--primary)",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background 0.2s"
            }}
          >
            <span>Đăng nhập thử nghiệm (Local Bypass)</span>
          </button>

          <div className="login-security"><ShieldCheck size={15} /> English Reflex không bao giờ thấy mật khẩu Google của bạn.</div>
          <small>Bằng việc tiếp tục, bạn đồng ý lưu dữ liệu học tập theo tài khoản này.</small>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="auth-loading-screen">Đang tải…</div>}><LoginContent /></Suspense>;
}
