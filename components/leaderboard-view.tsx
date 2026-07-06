"use client";

import { useEffect, useState, useCallback } from "react";
import { Crown, Flame, ShieldCheck, Sparkles, Star, TrendingUp, Trophy, LoaderCircle } from "lucide-react";
import { MobileHeader } from "@/components/sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { LeaderboardService, type LeaderboardEntry } from "@/services/leaderboardService";

type TabType = "today" | "weekly" | "monthly" | "total";

const tabLabels: { id: TabType; label: string }[] = [
  { id: "today", label: "Hôm nay" },
  { id: "weekly", label: "Tuần này" },
  { id: "monthly", label: "Tháng này" },
  { id: "total", label: "Tổng điểm" }
];

function getInitials(name: string) {
  const names = name.trim().split(/\s+/);
  if (names.length === 0) return "LN";
  return names.length > 1 ? names[0][0] + names[names.length - 1][0] : names[0][0];
}

export function LeaderboardView({ onMenu }: { onMenu: () => void }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("weekly");
  const [people, setPeople] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    try {
      let data: LeaderboardEntry[] = [];
      if (activeTab === "today") data = await LeaderboardService.getTodayLeaderboard();
      else if (activeTab === "weekly") data = await LeaderboardService.getWeeklyLeaderboard();
      else if (activeTab === "monthly") data = await LeaderboardService.getMonthlyLeaderboard();
      else data = await LeaderboardService.getTotalLeaderboard();
      setPeople(data);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    void loadLeaderboard();

    // Subscribe to realtime database updates
    const channel = supabase
      .channel("realtime-leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => { void loadLeaderboard(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_sentence_history" },
        () => { void loadLeaderboard(); }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeTab, loadLeaderboard]);

  const first = people[0] || null;
  const second = people[1] || null;
  const third = people[2] || null;

  const myRank = people.findIndex((p) => p.user_id === profile?.id) + 1;
  const myEntry = people.find((p) => p.user_id === profile?.id);
  const myExp = myEntry?.exp || 0;

  // exp distance to get to top 3
  const top3User = people[2];
  const targetExp = top3User ? top3User.exp : 1000;
  const expDiff = Math.max(0, targetExp - myExp);
  const sessionsCount = Math.ceil(expDiff / 10);

  return (
    <>
      <MobileHeader onMenu={onMenu} title="Xếp hạng" />
      <div className="page leaderboard-page">
        <header className="page-title-row">
          <div>
            <span className="eyebrow">CỘNG ĐỒNG REFLEX</span>
            <h1>Bảng xếp hạng</h1>
            <p>Thi đua lành mạnh, cùng nhau giữ nhịp học mỗi ngày.</p>
          </div>
          <div className="league-chip">
            <ShieldCheck size={19} />
            <div>
              <span>GIẢI HIỆN TẠI</span>
              <b>Hạng Vàng</b>
            </div>
          </div>
        </header>

        <div className="leader-tabs">
          {tabLabels.map((tab) => (
            <button 
              className={activeTab === tab.id ? "active" : ""} 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <LoaderCircle className="spin" size={32} />
          </div>
        ) : (
          <>
            <section className="podium-card">
              <div className="podium-glow" />
              {second && (
                <div className={`podium-person second ${profile?.id === second.user_id ? "me" : ""}`}>
                  <span className="podium-avatar">
                    {second.avatar || getInitials(second.display_name).substring(0, 2).toUpperCase()}
                  </span>
                  <i>2</i>
                  <strong>{second.display_name}</strong>
                  <small>{second.exp.toLocaleString("vi-VN")} EXP</small>
                  <div className="podium-block">2</div>
                </div>
              )}
              {first && (
                <div className={`podium-person first ${profile?.id === first.user_id ? "me" : ""}`}>
                  <Crown size={28} fill="currentColor" />
                  <span className="podium-avatar">
                    {first.avatar || getInitials(first.display_name).substring(0, 2).toUpperCase()}
                  </span>
                  <i>1</i>
                  <strong>{first.display_name}</strong>
                  <small>{first.exp.toLocaleString("vi-VN")} EXP</small>
                  <div className="podium-block">1</div>
                </div>
              )}
              {third && (
                <div className={`podium-person third ${profile?.id === third.user_id ? "me" : ""}`}>
                  <span className="podium-avatar">
                    {third.avatar || getInitials(third.display_name).substring(0, 2).toUpperCase()}
                  </span>
                  <i>3</i>
                  <strong>{third.display_name}</strong>
                  <small>{third.exp.toLocaleString("vi-VN")} EXP</small>
                  <div className="podium-block">3</div>
                </div>
              )}
            </section>

            <div className="leader-content">
              <section className="ranking-table">
                <div className="ranking-head">
                  <span>HẠNG</span>
                  <span>NGƯỜI HỌC</span>
                  <span>STREAK</span>
                  <span>ĐIỂM</span>
                </div>
                {people.length === 1 && profile?.id === people[0].user_id ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b", fontSize: "15px", lineHeight: "1.6" }}>
                    🎉 Bạn đang là người đầu tiên trên bảng xếp hạng.<br />
                    Hãy mời bạn bè cùng tham gia để cạnh tranh!
                  </div>
                ) : people.length > 3 ? (
                  people.slice(3).map((person) => {
                    const isMe = profile?.id === person.user_id;
                    return (
                      <div 
                        className={`ranking-row ${isMe ? "me" : ""}`} 
                        key={person.user_id} 
                        style={isMe ? { border: "2px solid #20b486", background: "rgba(32, 180, 134, 0.08)" } : {}}
                      >
                        <b>#{person.rank}</b>
                        <div className="rank-person">
                          <span>{person.avatar || getInitials(person.display_name).substring(0, 2).toUpperCase()}</span>
                          <div>
                            <strong>{person.display_name} {isMe && <i>✔ Bạn</i>}</strong>
                            <small>Level {person.level}</small>
                          </div>
                        </div>
                        <span className="rank-streak"><Flame size={15} fill="currentColor" /> {person.streak} ngày</span>
                        <strong>{person.exp.toLocaleString("vi-VN")} <small>EXP</small></strong>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    Không có người học khác xếp dưới.
                  </div>
                )}
              </section>

              <aside className="leader-rail">
                <div className="rail-card your-rank">
                  <div className="rank-big">
                    <Trophy size={22} />
                    <strong>{myRank > 0 ? `#${myRank}` : "N/A"}</strong>
                  </div>
                  {myRank > 3 && expDiff > 0 ? (
                    <>
                      <h3>Chỉ còn {expDiff.toLocaleString("vi-VN")} EXP để lên Top 3!</h3>
                      <p>Hoàn thành khoảng {sessionsCount} câu trả lời đúng nữa.</p>
                    </>
                  ) : myRank > 0 && myRank <= 3 ? (
                    <>
                      <h3>Tuyệt vời! Bạn đang nằm trong Top 3 dẫn đầu.</h3>
                      <p>Hãy tiếp tục luyện tập để duy trì phong độ!</p>
                    </>
                  ) : (
                    <>
                      <h3>Bạn chưa có điểm tích lũy.</h3>
                      <p>Bắt đầu luyện tập để ghi danh lên bảng xếp hạng!</p>
                    </>
                  )}
                  <div>
                    <i style={{ width: `${Math.min(100, Math.round((myExp / Math.max(1, targetExp)) * 100))}%` }} />
                  </div>
                  <span>
                    <b>{myExp.toLocaleString("vi-VN")}</b>
                    <small>{targetExp.toLocaleString("vi-VN")} EXP</small>
                  </span>
                </div>

                <div className="rail-card">
                  <div className="rail-title simple">
                    <div>
                      <h3>Thành tích mới</h3>
                      <p>Tuần này</p>
                    </div>
                    <Sparkles size={19} />
                  </div>
                  <div className="achievement">
                    <div>⚡</div>
                    <span>
                      <strong>Phản xạ thép</strong>
                      <small>50 câu đúng liên tiếp</small>
                    </span>
                  </div>
                  <div className="achievement">
                    <div>🌅</div>
                    <span>
                      <strong>Chim sớm</strong>
                      <small>Học trước 7 giờ sáng</small>
                    </span>
                  </div>
                </div>
              </aside>
            </div>

            <div className="promotion-banner">
              <TrendingUp size={22} />
              <div>
                <strong>Top 15 sẽ thăng hạng Bạch kim</strong>
                <span>Giải tuần kết thúc sau 2 ngày 14 giờ</span>
              </div>
              <Star size={22} fill="currentColor" />
            </div>
          </>
        )}
      </div>
    </>
  );
}
