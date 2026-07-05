"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Flame, LogOut, Star, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

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

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className="user-menu" ref={root}>
      <button className="user-menu-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatar-fallback">{initials(name)}</span>
        )}
        <span className="user-menu-copy">
          <strong>{name}</strong>
          <small>Level {profile?.level ?? 1} · {profile?.subscription_tier === "pro" ? "Pro" : "Free"}</small>
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
  );
}
