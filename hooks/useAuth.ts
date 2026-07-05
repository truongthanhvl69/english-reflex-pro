import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { UserProfile } from "@/services/authService";

export type ToastKind = "success" | "error" | "info";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  loginWithGoogle: (nextPath?: string) => Promise<void>;
  signInWithMock?: () => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  showToast: (message: string, kind?: ToastKind) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth pháº£i Ä‘Æ°á»£c dÃ¹ng bÃªn trong AuthProvider.");
  }
  return context;
}
