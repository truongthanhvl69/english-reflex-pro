"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Brain, CheckCircle2, Clock3, Flame, RotateCcw, Sparkles, Star, Target, TrendingUp, XCircle } from "lucide-react";
import { MobileHeader } from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { sentences } from "@/data/sentences";
import { getSentenceHistory, type SentenceHistory } from "@/services/progressService";

const sentenceText = new Map(sentences.map((sentence) => [sentence.id, sentence.english]));

export function ProgressView({ onMenu }: { onMenu: () => void }) {
  const { profile, showToast } = useAuth();
  const [history, setHistory] = useState<SentenceHistory[]>([]);

  useEffect(() => {
    void getSentenceHistory()
      .then(setHistory)
      .catch(() => showToast("Chưa thể tải lịch sử học tập.", "error"));
  }, [showToast]);

  const activity = useMemo(() => {
    const result = Array.from({ length: 14 }, (_, offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (13 - offset));
      return { date, value: 0 };
    });
    for (const item of history) {
      const itemDate = new Date(item.created_at);
      const day = result.find(({ date }) =>
        date.getFullYear() === itemDate.getFullYear() &&
        date.getMonth() === itemDate.getMonth() &&
        date.getDate() === itemDate.getDate()
      );
      if (day) day.value += 1;
    }
    return result;
  }, [history]);

  const reviewItems = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((item) => {
      if ((item.is_correct && !item.marked_hard) || seen.has(item.sentence_id)) return false;
      seen.add(item.sentence_id);
      return true;
    }).slice(0, 3);
  }, [history]);

  const recentItems = history.slice(0, 3);
  const accuracy = Number(profile?.accuracy ?? 0);
  const wrongAnswers = Math.max(0, (profile?.total_answers ?? 0) - (profile?.correct_answers ?? 0));
  const maxActivity = Math.max(1, ...activity.map((day) => day.value));
  const weeklyAnswers = activity.slice(-7).reduce((sum, day) => sum + day.value, 0);
  const missionProgress = Math.min(100, Math.round(((profile?.total_answers ?? 0) % 50) / 50 * 100));
  const stats = [
    { label: "Câu đã trả lời", value: String(profile?.total_answers ?? 0), detail: `+${weeklyAnswers} tuần này`, icon: Brain, color: "blue" },
    { label: "Độ chính xác", value: `${accuracy.toFixed(1)}%`, detail: `${profile?.correct_answers ?? 0} câu đúng`, icon: Target, color: "green" },
    { label: "Chuỗi ngày học", value: String(profile?.streak ?? 0), detail: "Đồng bộ theo tài khoản", icon: Flame, color: "orange" },
    { label: "Tổng EXP", value: (profile?.exp ?? 0).toLocaleString("vi-VN"), detail: `Level ${profile?.level ?? 1}`, icon: Star, color: "violet" },
  ];

  return <><MobileHeader onMenu={onMenu} title="Tiến bộ" /><div className="page progress-page"><header className="page-title-row"><div><span className="eyebrow">PHÂN TÍCH HỌC TẬP</span><h1>Tiến trình của riêng bạn</h1><p>Dữ liệu được đồng bộ an toàn theo tài khoản trên mọi thiết bị.</p></div><button className="button button-secondary"><RotateCcw size={17} /> Ôn tập thông minh</button></header>
    <div className="stats-grid">{stats.map(({ label, value, detail, icon: Icon, color }) => <div className="stat-card" key={label}><div className={`stat-icon ${color}`}><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><small><TrendingUp size={13} /> {detail}</small></div>)}</div>
    <div className="analytics-grid"><section className="analytics-card chart-card"><div className="analytics-heading"><div><h2>Hoạt động luyện tập</h2><p>Số câu đã trả lời trong 14 ngày</p></div></div><div className="big-chart"><div className="chart-y"><span>{maxActivity}</span><span>{Math.round(maxActivity * .66)}</span><span>{Math.round(maxActivity * .33)}</span><span>0</span></div><div className="chart-bars">{activity.map(({ date, value }, index) => <div key={date.toISOString()}><i style={{ height: `${(value / maxActivity) * 100}%` }} className={index === activity.length - 1 ? "latest" : ""} /><span>{index % 2 === 0 ? `${date.getDate()}/${date.getMonth() + 1}` : ""}</span></div>)}</div></div></section>
      <section className="analytics-card accuracy-card"><div className="analytics-heading"><div><h2>Tổng quan đáp án</h2><p>Toàn bộ lịch sử tài khoản</p></div><ArrowUpRight size={19} /></div><div className="accuracy-ring" style={{ background: `conic-gradient(var(--primary) 0 ${accuracy}%, #edf0f5 ${accuracy}%)` }}><div><strong>{accuracy.toFixed(0)}%</strong><span>Chính xác</span></div></div><div className="accuracy-legend"><span><i className="correct" /> Đúng <b>{profile?.correct_answers ?? 0}</b></span><span><i className="wrong" /> Sai <b>{wrongAnswers}</b></span></div></section>
    </div>
    <div className="review-grid"><section className="analytics-card"><div className="analytics-heading"><div><h2>Cần ôn lại</h2><p>{reviewItems.length} câu sai hoặc đã đánh dấu khó</p></div></div><div className="review-list">{reviewItems.length ? reviewItems.map((item) => { const type = item.marked_hard ? "hard" : (item.response_time_ms ?? 0) > 6000 ? "slow" : "due"; return <div key={item.id}><span className={`review-type ${type}`}>{type === "hard" ? <XCircle size={17} /> : type === "slow" ? <Clock3 size={17} /> : <AlertTriangle size={17} />}</span><div><strong>{sentenceText.get(item.sentence_id) || item.correct_answer}</strong><span>{item.marked_hard ? "Đã đánh dấu khó" : item.is_correct ? "Phản xạ chậm" : "Trả lời chưa đúng"}</span></div><small>{new Date(item.created_at).toLocaleDateString("vi-VN")}</small></div>; }) : <p className="empty-learning-state">Chưa có câu nào cần ôn. Hãy bắt đầu một phiên luyện nhé.</p>}</div></section>
      <section className="analytics-card"><div className="analytics-heading"><div><h2>Lịch sử gần đây</h2><p>Đúng/sai và thời gian phản xạ</p></div><Sparkles size={19} /></div><div className="review-list">{recentItems.length ? recentItems.map((item) => <div key={item.id}><span className={`review-type ${item.is_correct ? "correct" : "hard"}`}>{item.is_correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}</span><div><strong>{sentenceText.get(item.sentence_id) || item.correct_answer}</strong><span>{item.is_correct ? "Đúng" : "Sai"} · {item.response_time_ms ? `${(item.response_time_ms / 1000).toFixed(1)} giây` : "Luyện nói"}</span></div><small>{new Date(item.created_at).toLocaleDateString("vi-VN")}</small></div>) : <p className="empty-learning-state">Lịch sử sẽ xuất hiện sau câu trả lời đầu tiên.</p>}</div></section></div>
    <div className="mission-banner"><div className="mission-icon"><CheckCircle2 size={25} /></div><div><span>MỤC TIÊU CÁ NHÂN</span><h3>Hoàn thành thêm 50 câu luyện phản xạ</h3><p>{(profile?.total_answers ?? 0) % 50}/50 câu · Dữ liệu được lưu tự động</p></div><div className="mission-progress"><div><i style={{ width: `${missionProgress}%` }} /></div><b>{missionProgress}%</b></div></div>
  </div></>;
}
