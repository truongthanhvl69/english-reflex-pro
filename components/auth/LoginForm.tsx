"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "./LoginButton";

export function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const { signInWithEmail, signInWithMock, showToast } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateEmail = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Form validations
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg("Email không đúng định dạng.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // AuthProvider handles page redirection if user is loaded, but let's push route just in case.
      router.replace(nextPath);
    } catch (e: any) {
      console.error(e);
      // Error message translation is handled by AuthProvider's toast, but let's also show it locally.
      const rawMsg = e.message || "";
      if (rawMsg.includes("Invalid login credentials") || rawMsg.includes("invalid_credentials")) {
        setErrorMsg("Email hoặc mật khẩu không chính xác.");
      } else {
        setErrorMsg(rawMsg || "Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    showToast("Tính năng khôi phục mật khẩu đang được phát triển. Vui lòng thử lại sau hoặc đăng nhập bằng tài khoản khác.", "info");
  };

  return (
    <div className="login-card">
      <div className="login-card-icon">
        <ShieldCheck size={30} />
      </div>
      <span className="eyebrow">CHÀO MỪNG BẠN</span>
      <h2>Đăng nhập tài khoản</h2>
      <p>Nhập email và mật khẩu của bạn để tiếp tục học tập phản xạ tiếng Anh.</p>

      {errorMsg && (
        <div className="auth-error-msg" style={{ marginBottom: "15px" }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            type="password"
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button type="submit" className="auth-submit-button" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle className="spin" size={18} />
              <span>Đang đăng nhập…</span>
            </>
          ) : (
            <span>Đăng nhập</span>
          )}
        </button>
      </form>

      <div className="auth-links">
        <a href="#" className="auth-link" onClick={handleForgotPassword}>
          Quên mật khẩu?
        </a>
        <a href="/register" className="auth-link">
          Chưa có tài khoản? Đăng ký
        </a>
      </div>

      <div className="auth-divider">hoặc</div>

      <LoginButton nextPath={nextPath} label="Tiếp tục với Google" />

      {signInWithMock && (
        <button
          className="mock-login-button"
          onClick={() => signInWithMock()}
          disabled={loading}
          style={{
            marginTop: "12px",
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            background: "var(--primary-soft)",
            border: "1px dashed var(--primary)",
            color: "var(--primary)",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s",
          }}
        >
          <span>Đăng nhập thử nghiệm (Bypass)</span>
        </button>
      )}

      <div className="login-security" style={{ marginTop: "20px" }}>
        <ShieldCheck size={14} style={{ color: "#20b486" }} /> 
        <span>Tài khoản được bảo mật mã hóa qua Supabase Auth.</span>
      </div>
    </div>
  );
}
