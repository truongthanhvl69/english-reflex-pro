"use client";

import {
  ArrowRight, BarChart3, BookOpenCheck, Bot, CalendarDays, Check, ChevronRight,
  Flame, Headphones, Keyboard, Mic2, Play, Puzzle, Sparkles, Star, Target, Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AppView, PracticeMode } from "@/types";
import { MobileHeader } from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";

const modes: { id: PracticeMode; title: string; subtitle: string; icon: typeof Keyboard; accent: string; tag?: string }[] = [
  { id: "typing", title: "Gõ phản xạ", subtitle: "Việt → Anh", icon: Keyboard, accent: "blue", tag: "GỢI Ý" },
  { id: "word-bank", title: "Ghép từ", subtitle: "Xếp câu đúng", icon: Puzzle, accent: "violet" },
  { id: "listening", title: "Nghe & chép", subtitle: "Luyện đôi tai", icon: Headphones, accent: "orange" },
  { id: "reverse", title: "Dịch ngược", subtitle: "Anh → Việt", icon: BookOpenCheck, accent: "green" },
  { id: "speaking", title: "Phát âm AI", subtitle: "Nói tự tin", icon: Mic2, accent: "pink", tag: "AI" },
];

interface Props {
  onStart: (mode: PracticeMode) => void;
  onMenu: () => void;
  onNavigate: (view: AppView) => void;
}

export function Dashboard({ onStart, onMenu, onNavigate }: Props) {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ").at(-1) || "bạn";

  return (
    <>
      <MobileHeader onMenu={onMenu} />
      <div className="page dashboard-page">
        <header className="desktop-page-header">
          <div><span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span><h1>Xin chào, {firstName}! <span>👋</span></h1><p>Mỗi câu nói hôm nay là một bước gần hơn tới phản xạ tự nhiên.</p></div>
          <div className="header-actions"><button className="icon-button notification"><CalendarDays size={19} /><i /></button><div className="exp-chip"><Star size={17} fill="currentColor" /><span><b>{(profile?.exp ?? 0).toLocaleString("vi-VN")}</b> EXP</span></div></div>
        </header>

        <section className="hero-card">
          <div className="hero-glow one" /><div className="hero-glow two" />
          <div className="hero-content">
            <div className="hero-kicker"><Sparkles size={15} /> PHIÊN LUYỆN HÔM NAY</div>
            <h2>Biến tiếng Anh thành<br /><em>phản xạ của bạn.</em></h2>
            <p>10 phút tập trung · 20 câu chọn riêng cho trình độ A1 của bạn</p>
            <div className="hero-actions">
              <button className="button button-white" onClick={() => onStart("typing")}><Play size={17} fill="currentColor" /> Bắt đầu luyện <ArrowRight size={17} /></button>
              <div className="hero-avatars"><span>🧑🏻</span><span>👩🏻</span><span>🧑🏽</span><small>+2.4k đang học</small></div>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one"><span>Hi!</span></div>
            <div className="orbit orbit-two"><span>How&apos;s it going?</span></div>
            <div className="hero-mascot"><Bot size={56} /><i className="mascot-spark">✦</i></div>
            <div className="waveform">{[8, 16, 25, 13, 32, 20, 11, 27, 16, 8].map((height, i) => <i key={i} style={{ height }} />)}</div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-primary">
            <div className="section-heading"><div><h2>Chọn cách bạn muốn luyện</h2><p>Đổi chế độ bất cứ lúc nào trong bài học</p></div><button className="text-button" onClick={() => onNavigate("courses")}>Xem tất cả <ChevronRight size={16} /></button></div>
            <div className="mode-grid">
              {modes.map((mode, index) => (
                <motion.button key={mode.id} className={`mode-card ${mode.accent}`} onClick={() => onStart(mode.id)} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.18 }}>
                  {mode.tag && <span className="mode-tag">{mode.tag}</span>}
                  <span className="mode-icon"><mode.icon size={23} /></span>
                  <strong>{mode.title}</strong><span>{mode.subtitle}</span>
                  {index === 0 && <i className="active-dot" />}
                </motion.button>
              ))}
            </div>

            <div className="section-heading course-heading"><div><h2>Tiếp tục hành trình</h2><p>Học tiếp từ nơi bạn đã dừng lại</p></div><button className="text-button" onClick={() => onNavigate("courses")}>Thư viện <ChevronRight size={16} /></button></div>
            <div className="continue-card">
              <div className="course-art"><span>A1</span><i>HELLO!</i><b>💬</b></div>
              <div className="continue-info">
                <div className="course-meta"><span className="level-badge">A1 · NỀN TẢNG</span><span>7/10 bài</span></div>
                <h3>Giao tiếp hằng ngày</h3><p>Bài 08: Hỏi đường & phương tiện</p>
                <div className="progress-row"><div className="progress-track"><i style={{ width: "68%" }} /></div><b>68%</b></div>
              </div>
              <button className="circle-play" onClick={() => onStart("typing")} aria-label="Tiếp tục học"><Play size={19} fill="currentColor" /></button>
            </div>
          </div>

          <aside className="dashboard-rail">
            <DailyGoal />
            <WeeklyActivity />
            <MiniLeaderboard onOpen={() => onNavigate("leaderboard")} />
          </aside>
        </section>
      </div>
    </>
  );
}

function DailyGoal() {
  return <div className="rail-card daily-card"><div className="rail-title"><div className="rail-icon orange"><Target size={18} /></div><div><h3>Mục tiêu hôm nay</h3><p>Còn 6 phút nữa thôi!</p></div><b>60%</b></div><div className="goal-progress"><i style={{ width: "60%" }} /></div><div className="goal-stats"><span><Flame size={15} fill="currentColor" /> 6/10 phút</span><span><Check size={15} /> 12 câu</span></div></div>;
}

function WeeklyActivity() {
  const days = [{ d: "T2", v: 56 }, { d: "T3", v: 80 }, { d: "T4", v: 43 }, { d: "T5", v: 92 }, { d: "T6", v: 66 }, { d: "T7", v: 10 }, { d: "CN", v: 10 }];
  return <div className="rail-card weekly-card"><div className="rail-title simple"><div><h3>Nhịp học tuần này</h3><p>4 ngày hoạt động</p></div><BarChart3 size={19} /></div><div className="week-bars">{days.map((day, i) => <div key={day.d}><div className={`bar ${i === 4 ? "today" : ""}`}><i style={{ height: `${day.v}%` }} /></div><span>{day.d}</span></div>)}</div></div>;
}

function MiniLeaderboard({ onOpen }: { onOpen: () => void }) {
  return <div className="rail-card leaderboard-mini"><div className="rail-title simple"><div><h3>Top tuần này</h3><p>Hạng của bạn: #12</p></div><button className="icon-button tiny" onClick={onOpen}><Trophy size={17} /></button></div><div className="rank-list">{[["1", "Linh Phạm", "2,480", "LP"], ["2", "An Trần", "2,310", "AT"], ["3", "Khoa Lê", "2,190", "KL"]].map(([rank, name, score, initials]) => <div key={rank}><b>{rank}</b><span className="mini-avatar">{initials}</span><strong>{name}</strong><small>{score} XP</small></div>)}</div></div>;
}
