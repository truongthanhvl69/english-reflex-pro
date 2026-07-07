import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  provider: "google" | "email";
  exp: number;
  level: number;
  streak: number;
  accuracy: number;
  total_answers: number;
  correct_answers: number;
  subscription_tier: "free" | "pro" | "premium";
  username?: string | null;
  bio?: string | null;
  country?: string | null;
  timezone?: string | null;
  language?: string | null;
  last_login_at?: string | null;
  membership_type?: string | null;
  notification_study_alerts?: boolean;
  notification_email_reminders?: boolean;
  notification_achievements?: boolean;
  notification_promotions?: boolean;
  privacy_show_on_leaderboard?: boolean;
  privacy_public_profile?: boolean;
  privacy_show_streak?: boolean;
  privacy_show_level?: boolean;
  created_at: string;
  updated_at: string;
}

function googleProfile(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      user.user_metadata.full_name ??
      user.user_metadata.name ??
      user.email?.split("@")[0] ??
      "Learner",
    avatar_url:
      user.user_metadata.avatar_url ?? user.user_metadata.picture ?? null,
  };
}

export async function signInWithGoogle(nextPath = "/") {
  const siteUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";

  localStorage.setItem("english_reflex_oauth_pending", "true");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      queryParams: {
        access_type: "online",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    localStorage.removeItem("english_reflex_oauth_pending");
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getOrCreateProfile(user: User): Promise<UserProfile> {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as UserProfile;

  const { data, error } = await supabase
    .from("profiles")
    .insert(googleProfile(user))
    .select("*")
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function registerWithEmail({ fullName, email, password }: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function loginWithEmail({ email, password }: any) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function loginWithGoogle(nextPath = "/") {
  return signInWithGoogle(nextPath);
}

export async function logout() {
  return signOut();
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}
