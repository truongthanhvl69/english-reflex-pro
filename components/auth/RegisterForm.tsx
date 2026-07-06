"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function RegisterForm({ nextPath = "/" }: { nextPath?: string }) {
  const { signUpWithEmail } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const validateEmail = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ các trường thông tin.");
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

    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu nhập lại không trùng khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await signUpWithEmail(fullName, email, password);
      if (res && !res.emailConfirmed) {
        setRegisteredEmail(email);
      } else {
        // Wait a moment before redirecting so they see the success toast
        setTimeout(() => {
          router.replace(nextPath);
        }, 500);
      }
    } catch (e: any) {
      console.error(e);
      const rawMsg = e.message || "";
      if (rawMsg.includes("User already registered")) {
        setErrorMsg("Email này đã được đăng ký sử dụng.");
      } else {
        setErrorMsg(rawMsg || "Không thể đăng ký tài khoản. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="login-card">
        <div className="login-card-icon" style={{ color: "var(--green)", background: "#eafaf5" }}>
          <UserPlus size={30} />
        </div>
        <span className="eyebrow" style={{ color: "var(--green)" }}>BẮT ĐẦU NGAY</span>
        
        <div style={{ padding: "10px 0", textAlign: "center" }}>
          <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>🎉 Đăng ký thành công!</h2>
          <p style={{ color: "#475569", lineHeight: "1.6", marginBottom: "20px" }}>
            Chúng tôi đã gửi một email xác nhận đến:
          </p>
          <div style={{ 
            background: "#f1f5f9", 
            padding: "12px 18px", 
            borderRadius: "10px", 
            fontWeight: "700", 
            color: "#1e293b",
            fontSize: "15px",
            marginBottom: "24px",
            wordBreak: "break-all"
          }}>
            {registeredEmail}
          </div>
          <p style={{ color: "#475569", lineHeight: "1.6", marginBottom: "28px" }}>
            Vui lòng mở Gmail, bấm vào liên kết xác nhận tài khoản, sau đó quay lại đăng nhập.
          </p>
        </div>

        <button onClick={() => router.push("/login")} className="auth-submit-button" style={{ background: "linear-gradient(135deg, #20b486, #189870)", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center" }}>
          Quay lại Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="login-card">
      <div className="login-card-icon" style={{ color: "var(--green)", background: "#eafaf5" }}>
        <UserPlus size={30} />
      </div>
      <span className="eyebrow" style={{ color: "var(--green)" }}>BẮT ĐẦU NGAY</span>
      <h2>Tạo tài khoản mới</h2>
      <p>Đăng ký tài khoản để lưu lại tiến trình học và ôn tập phản xạ tiếng Anh của bạn.</p>

      {errorMsg && (
        <div className="auth-error-msg" style={{ marginBottom: "15px" }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-form-group">
          <label htmlFor="fullName">Họ và tên</label>
          <input
            id="fullName"
            type="text"
            className="auth-input"
            placeholder="Gia Bảo Hồ"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="giabaoho6973@gmail.com"
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
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>
          <input
            id="confirmPassword"
            type="password"
            className="auth-input"
            placeholder="Nhập lại mật khẩu trên"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button type="submit" className="auth-submit-button" disabled={loading} style={{ background: "linear-gradient(135deg, #20b486, #189870)", boxShadow: "0 8px 18px rgba(32, 180, 134, 0.2)" }}>
          {loading ? (
            <>
              <LoaderCircle className="spin" size={18} />
              <span>Đang tạo tài khoản…</span>
            </>
          ) : (
            <span>Đăng ký tài khoản</span>
          )}
        </button>
      </form>

      <div className="auth-links" style={{ justifyContent: "center" }}>
        <a href="/login" className="auth-link">
          Đã có tài khoản? Đăng nhập ngay
        </a>
      </div>

      <div className="login-security" style={{ marginTop: "25px" }}>
        <ShieldCheck size={14} style={{ color: "#20b486" }} /> 
        <span>English Reflex bảo vệ an toàn thông tin mật khẩu của bạn.</span>
      </div>
    </div>
  );
}
