"use client";

import {
  BarChart3, BookOpen, ChevronLeft, Flame, GraduationCap, Headphones,
  Home, Menu, Settings, Trophy, X,
} from "lucide-react";
import type { AppView } from "@/types";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";

const navigation: { id: AppView; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Tổng quan", icon: Home },
  { id: "practice", label: "Luyện tập", icon: Headphones },
  { id: "courses", label: "Khóa học", icon: BookOpen },
  { id: "progress", label: "Tiến bộ", icon: BarChart3 },
  { id: "leaderboard", label: "Xếp hạng", icon: Trophy },
];

interface Props {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ activeView, onNavigate, open, onClose }: Props) {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ").at(-1) || "bạn";

  return (
    <>
      {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Đóng menu" />}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-row">
          <button className="brand-mark" onClick={() => onNavigate("home")} aria-label="Về trang chủ">
            <GraduationCap size={25} strokeWidth={2.5} />
          </button>
          <button className="brand-copy" onClick={() => onNavigate("home")}>
            <strong>English Reflex</strong><span>PRO</span>
          </button>
          <button className="mobile-close" onClick={onClose} aria-label="Đóng menu"><X size={20} /></button>
        </div>

        <nav className="nav-list" aria-label="Điều hướng chính">
          <span className="nav-caption">KHÔNG GIAN HỌC</span>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeView === id ? "active" : ""}`} onClick={() => onNavigate(id)}>
              <Icon size={19} /><span>{label}</span>
              {id === "practice" && <span className="nav-pill">12</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="streak-card">
          <div className="streak-icon"><Flame size={21} fill="currentColor" /></div>
          <div><strong>{profile?.streak ?? 0} ngày liên tiếp</strong><span>Giữ lửa nhé, {firstName}!</span></div>
          <ChevronLeft className="streak-arrow" size={17} />
        </div>
        <button
          className={`nav-item ${activeView === "settings" ? "active" : ""}`}
          onClick={() => onNavigate("settings")}
        >
          <Settings size={19} />
          <span>Cài đặt</span>
        </button>
        <UserMenu />
      </aside>
    </>
  );
}

export function MobileHeader({ onMenu, title }: { onMenu: () => void; title?: string }) {
  const { profile } = useAuth();

  return (
    <div className="mobile-header">
      <button className="icon-button" onClick={onMenu} aria-label="Mở menu"><Menu size={21} /></button>
      <div className="mobile-brand"><GraduationCap size={21} /><strong>{title || "English Reflex"}</strong></div>
      <div className="mobile-exp"><Flame size={16} fill="currentColor" /> {profile?.streak ?? 0}</div>
    </div>
  );
}
