"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  getOrCreateProfile,
  getProfile,
  getSession,
  signInWithGoogle as startGoogleLogin,
  signOut as endSession,
  registerWithEmail,
  loginWithEmail,
  type UserProfile,
} from "@/services/authService";
import { AuthContext, type ToastKind } from "@/hooks/useAuth";

interface ToastState {
  message: string;
  kind: ToastKind;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  const hydrateSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setProfile(null);
      return;
    }
    setProfile(await getOrCreateProfile(nextSession.user));
  }, []);

  useEffect(() => {
    let active = true;

    // Check if there is a local mock user first
    const mockUserStr = typeof window !== "undefined" ? localStorage.getItem("english_reflex_mock_user") : null;
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        setSession(mockUser.session);
        setProfile(mockUser.profile);
        setLoading(false);
      } catch (e) {
        console.error("Lỗi parse mock user:", e);
      }
    } else {
      void getSession()
        .then(async (initialSession) => {
          if (active) await hydrateSession(initialSession);
        })
        .catch(() => {
          if (active) showToast("Không thể tải phiên đăng nhập. Vui lòng thử lại.", "error");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // If we are using a mock user, bypass Supabase auth changes
      const isMock = typeof window !== "undefined" && !!localStorage.getItem("english_reflex_mock_user");
      if (isMock) return;

      window.setTimeout(() => {
        if (!active) return;
        void hydrateSession(nextSession)
          .then(() => {
            if (event === "SIGNED_IN" && localStorage.getItem("english_reflex_oauth_pending")) {
              localStorage.removeItem("english_reflex_oauth_pending");
              showToast("Đăng nhập thành công. Chào mừng bạn quay lại!", "success");
            }
          })
          .catch(() => showToast("Không thể tải hồ sơ tài khoản.", "error"))
          .finally(() => setLoading(false));
      }, 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [hydrateSession, showToast]);

  const login = useCallback(async (nextPath = "/") => {
    try {
      showToast("Đang kết nối... Bạn sẽ được chuyển sang Google để đăng nhập an toàn. Một số tài khoản có thể cần xác minh danh tính lần đầu.", "info");
      await new Promise((resolve) => setTimeout(resolve, 800));
      await startGoogleLogin(nextPath);
    } catch {
      showToast("Không thể đăng nhập. Vui lòng thử lại.", "error");
      throw new Error("Google sign-in failed");
    }
  }, [showToast]);

  const loginMock = useCallback(async () => {
    const mockSession = {
      access_token: "mock-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: {
        id: "mock-user-uuid-1234-5678-901234567890",
        email: "guest@englishreflex.pro",
        user_metadata: { full_name: "Minh Nguyễn", avatar_url: null },
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      }
    } as unknown as Session;

    const mockProfile = {
      id: "mock-user-uuid-1234-5678-901234567890",
      email: "guest@englishreflex.pro",
      full_name: "Minh Nguyễn",
      avatar_url: null,
      provider: "email",
      exp: 1240,
      level: 8,
      streak: 7,
      accuracy: 92,
      total_answers: 120,
      correct_answers: 110,
      subscription_tier: "pro",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as UserProfile;

    localStorage.setItem("english_reflex_mock_user", JSON.stringify({ session: mockSession, profile: mockProfile }));
    setSession(mockSession);
    setProfile(mockProfile);
    showToast("Đăng nhập bằng tài khoản thử nghiệm thành công!", "success");
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem("english_reflex_mock_user");
      await endSession();
      setSession(null);
      setProfile(null);
      showToast("Bạn đã đăng xuất.", "success");
    } catch {
      showToast("Không thể đăng xuất. Vui lòng thử lại.", "error");
    }
  }, [showToast]);

  const translateError = (err: any): string => {
    const msg = err?.message || "";
    if (msg.includes("User already registered")) {
      return "Email này đã được đăng ký sử dụng.";
    }
    if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
      return "Tài khoản hoặc mật khẩu không chính xác.";
    }
    if (msg.includes("Password should be at least 6 characters")) {
      return "Mật khẩu phải có độ dài tối thiểu 6 ký tự.";
    }
    return msg || "Đã xảy ra lỗi, vui lòng thử lại.";
  };

  const signUpWithEmail = useCallback(async (fullName: string, email: string, password: string) => {
    try {
      setLoading(true);
      const signUpData = await registerWithEmail({ fullName, email, password });
      if (signUpData.session) {
        await hydrateSession(signUpData.session);
        showToast("Đăng ký thành công!", "success");
        return { session: signUpData.session, emailConfirmed: true };
      } else if (signUpData.user) {
        return { user: signUpData.user, emailConfirmed: false };
      } else {
        throw new Error("Không thể đăng ký tài khoản.");
      }
    } catch (e: any) {
      console.error("SignUp error:", e);
      showToast(translateError(e), "error");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [hydrateSession, showToast]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const signInData = await loginWithEmail({ email, password });
      if (signInData.session) {
        await hydrateSession(signInData.session);
        showToast("Đăng nhập thành công!", "success");
      }
    } catch (e: any) {
      console.error("SignIn error:", e);
      showToast(translateError(e), "error");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [hydrateSession, showToast]);

  const refreshProfile = useCallback(async () => {
    if (localStorage.getItem("english_reflex_mock_user")) return; // skip for mock user
    if (!session?.user.id) return;
    setProfile(await getProfile(session.user.id));
  }, [session?.user.id]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signInWithGoogle: login,
    loginWithGoogle: login,
    signInWithMock: loginMock,
    signOut: logout,
    logout: logout,
    signUpWithEmail,
    signInWithEmail,
    refreshProfile,
    showToast,
  }), [loading, login, loginMock, logout, profile, refreshProfile, session, showToast, signUpWithEmail, signInWithEmail]);

  const ToastIcon =
    toast?.kind === "success" ? CheckCircle2 :
    toast?.kind === "error" ? CircleAlert :
    Info;

  return (
    <AuthContext.Provider value={value}>
      {children}
      {toast && (
        <div className={`app-toast ${toast.kind}`} role="status" aria-live="polite">
          <ToastIcon size={19} />
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Đóng thông báo">
            <X size={16} />
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}
