"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Flame, LogOut, Star, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import { UserAvatar } from "@/components/common/UserAvatar";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const name = profile?.full_name || user?.user_metadata.name || "Learner";
  const email = profile?.email || user?.email || "";
  const currentTier = profile?.subscription_tier || "free";
  const badge = currentTier === "premium" ? "👑 PREMIUM" : currentTier === "pro" ? "⭐ PRO" : "FREE";

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className="user-menu-sidebar-container" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
      {currentTier === "free" && (
        <button
          className="upgrade-btn-gold"
          onClick={() => router.push("/pricing")}
          style={{
            background: "linear-gradient(135deg, #f5dfa4, #ffd466)",
            color: "#8c6e2c",
            border: "1px solid #f5dfa4",
            borderRadius: "9px",
            padding: "9px 12px",
            fontSize: "11px",
            fontWeight: "800",
            cursor: "pointer",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 4px 10px rgba(242, 164, 20, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          ⭐ Nâng cấp Pro
        </button>
      )}
      <div className="user-menu" ref={root} style={{ width: "100%" }}>
        <button className="user-menu-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UserAvatar avatarUrl={profile?.avatar_url} fullName={name} email={email} size={32} />
          <span className="user-menu-copy">
            <strong>{name}</strong>
            <small>Level {profile?.level ?? 1} · <span style={{ fontWeight: 800, color: currentTier === "pro" ? "#e9a116" : currentTier === "premium" ? "#8768f8" : "#8993a5" }}>{badge}</span></small>
          </span>
          <ChevronDown size={16} />
        </button>

      {open && (
        <div className="user-menu-popover">
          <div className="user-menu-identity">
            <strong>{name}</strong>
            <span>{email}</span>
          </div>
          <div className="user-menu-stats">
            <span><Star size={14} /> <b>{profile?.exp ?? 0}</b> EXP</span>
            <span><Flame size={14} /> <b>{profile?.streak ?? 0}</b> ngày</span>
          </div>
          <button onClick={() => { setOpen(false); router.push("/profile"); }}>
            <UserRound size={16} /> Hồ sơ cá nhân
          </button>
          <button className="logout-action" onClick={() => void signOut()}>
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
