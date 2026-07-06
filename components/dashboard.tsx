"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight, BarChart3, BookOpenCheck, Bot, CalendarDays, Check, ChevronRight,
  Flame, Headphones, Keyboard, Mic2, Play, Puzzle, Sparkles, Star, Target, Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AppView, PracticeMode } from "@/types";
import { MobileHeader } from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { getContinueLearningState } from "@/services/learningStateService";
import { courses, lessons, dailyLessons, continuousLessons } from "@/data/courses";

const modes: { id: PracticeMode; title: string; subtitle: string; icon: typeof Keyboard; accent: string; tag?: string }[] = [
  { id: "typing", title: "Gõ phản xạ", subtitle: "Việt → Anh", icon: Keyboard, accent: "blue", tag: "GỢI Ý" },
  { id: "word-bank", title: "Ghép từ", subtitle: "Xếp câu đúng", icon: Puzzle, accent: "violet" },
  { id: "listening", title: "Nghe & chép", subtitle: "Luyện đôi tai", icon: Headphones, accent: "orange" },
  { id: "reverse", title: "Dịch ngược", subtitle: "Anh → Việt", icon: BookOpenCheck, accent: "green" },
  { id: "speaking", title: "Phát âm AI", subtitle: "Nói tự tin", icon: Mic2, accent: "pink", tag: "AI" },
];

interface Props {
  onStart: (mode: PracticeMode, lessonId?: string) => void;
  onMenu: () => void;
  onNavigate: (view: AppView) => void;
}

function getLessonDetails(lessonId: string) {
  const parts = lessonId.split("-");
  const courseId = parts[0];
  const num = Number(parts[1]);
  if (isNaN(num)) return { title: lessonId, subtitle: "" };

  if (courseId === "a1") {
    const les = lessons.find((l) => l.id === lessonId);
    return { title: les?.title || `Bài ${num}`, subtitle: les?.subtitle || "Nền tảng phản xạ" };
  }
  if (courseId === "daily") {
    const les = dailyLessons.find((l) => l.id === lessonId);
    return { title: les?.title || `Bài ${num}`, subtitle: les?.subtitle || "Giao tiếp hàng ngày" };
  }
  if (courseId === "continuous") {
    const les = continuousLessons.find((l) => l.id === lessonId);
    return { title: les?.title || `Bài ${num}`, subtitle: les?.subtitle || "Thì hiện tại tiếp diễn" };
  }
  return { title: `Bài ${num}`, subtitle: "Bài học phản xạ" };
}

export function Dashboard({ onStart, onMenu, onNavigate }: Props) {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ").at(-1) || "bạn";
  const [continueState, setContinueState] = useState<{
    courseId: string;
    lessonId: string;
    sentenceIndex: number;
    mode: PracticeMode;
    status: string;
  } | null>(null);

  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        getContinueLearningState(user.id)
          .then((data) => {
            setContinueState({
              ...data,
              mode: data.mode as PracticeMode,
            });
          })
          .catch((err) => console.error("Error loading continuation state:", err));

        // Load leaderboard rankings dynamically
        supabase
          .from("profiles")
          .select("id, email, full_name, exp")
          .order("exp", { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) {
              const list = data.map((item, index) => {
                const names = item.full_name ? item.full_name.trim().split(/\s+/) : [];
                const initials = names.length > 0 
                  ? (names.length > 1 ? names[0][0] + names[names.length - 1][0] : names[0][0])
                  : item.email ? item.email[0].toUpperCase() : "LN";
                
                return {
                  id: item.id,
                  rank: index + 1,
                  name: item.full_name || item.email?.split("@")[0] || "Learner",
                  exp: item.exp || 0,
                  initials: initials.substring(0, 2).toUpperCase()
                };
              });
              setTopUsers(list.slice(0, 3));
              
              const myPos = list.findIndex(p => p.id === user.id);
              if (myPos !== -1) {
                setMyRank(myPos + 1);
              }
            }
          });
      }
    });
  }, [profile]);

  const activeCourse = continueState ? courses.find((c) => c.id === continueState.courseId) : null;
  const activeLessonDetails = continueState ? getLessonDetails(continueState.lessonId) : null;
  const activeProgressPercent = continueState ? Math.min(100, Math.round((continueState.sentenceIndex / 10) * 100)) : 0;

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
            <p>10 phút tập trung · 20 câu chọn riêng cho trình độ của bạn</p>
            <div className="hero-actions">
              <button 
                className="button button-white" 
                onClick={() => onStart(continueState?.mode || "typing", continueState?.lessonId || "a1-1")}
              >
                <Play size={17} fill="currentColor" /> Bắt đầu luyện <ArrowRight size={17} />
              </button>
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
                <motion.button key={mode.id} className={`mode-card ${mode.accent}`} onClick={() => onStart(mode.id, continueState?.lessonId || "a1-1")} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.18 }}>
                  {mode.tag && <span className="mode-tag">{mode.tag}</span>}
                  <span className="mode-icon"><mode.icon size={23} /></span>
                  <strong>{mode.title}</strong><span>{mode.subtitle}</span>
                  {index === 0 && <i className="active-dot" />}
                </motion.button>
              ))}
            </div>

            <div className="section-heading course-heading"><div><h2>Tiếp tục hành trình</h2><p>Học tiếp từ nơi bạn đã dừng lại</p></div><button className="text-button" onClick={() => onNavigate("courses")}>Thư viện <ChevronRight size={16} /></button></div>
            {continueState ? (
              <div className="continue-card">
                <div className={`course-art ${activeCourse?.color || "blue"}`}>
                  <span>{activeCourse?.level || "A1"}</span>
                  <i>{activeCourse?.title?.substring(0, 6)?.toUpperCase() || "REFLEX"}</i>
                  <b>{activeCourse?.icon || "💬"}</b>
                </div>
                <div className="continue-info">
                  <div className="course-meta">
                    <span className="level-badge">{activeCourse?.level || "A1"} · {activeCourse?.title || "Nền tảng"}</span>
                    <span>{continueState.sentenceIndex}/10 câu</span>
                  </div>
                  <h3>{activeCourse?.title || "Đang học"}</h3>
                  <p>{activeLessonDetails?.title}: {activeLessonDetails?.subtitle}</p>
                  <div className="progress-row">
                    <div className="progress-track"><i style={{ width: `${activeProgressPercent}%` }} /></div>
                    <b>{activeProgressPercent}%</b>
                  </div>
                </div>
                <button 
                  className="circle-play" 
                  onClick={() => onStart(continueState.mode || "typing", continueState.lessonId)} 
                  aria-label="Tiếp tục học"
                >
                  <Play size={19} fill="currentColor" />
                </button>
              </div>
            ) : (
              <div className="continue-card" style={{ justifyContent: "center", padding: "30px" }}>
                <p style={{ color: "#64748b" }}>Đang tải lộ trình học tiếp...</p>
              </div>
            )}
          </div>

          <aside className="dashboard-rail">
            <DailyGoal />
            <WeeklyActivity />
            <MiniLeaderboard onOpen={() => onNavigate("leaderboard")} topUsers={topUsers} myRank={myRank} />
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

function MiniLeaderboard({ onOpen, topUsers, myRank }: { onOpen: () => void; topUsers: any[]; myRank: number | null }) {
  return (
    <div className="rail-card leaderboard-mini">
      <div className="rail-title simple">
        <div>
          <h3>Top tuần này</h3>
          <p>{myRank ? `Hạng của bạn: #${myRank}` : "Bạn chưa có thứ hạng"}</p>
        </div>
        <button className="icon-button tiny" onClick={onOpen}><Trophy size={17} /></button>
      </div>
      <div className="rank-list">
        {topUsers.map((user) => (
          <div key={user.id}>
            <b>{user.rank}</b>
            <span className="mini-avatar">{user.initials}</span>
            <strong>{user.name}</strong>
            <small>{user.exp.toLocaleString("vi-VN")} XP</small>
          </div>
        ))}
        {topUsers.length === 0 && (
          <p style={{ color: "#64748b", fontSize: "13px", textAlign: "center", padding: "10px 0" }}>Chưa có người học.</p>
        )}
      </div>
    </div>
  );
}
