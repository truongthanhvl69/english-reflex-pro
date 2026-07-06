"use client";

import { useEffect, useState } from "react";
import { Crown, Flame, Medal, ShieldCheck, Sparkles, Star, TrendingUp, Trophy, LoaderCircle } from "lucide-react";
import { MobileHeader } from "@/components/sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useMembership } from "@/hooks/useMembership";

export function LeaderboardView({ onMenu }: { onMenu: () => void }) {
  const { profile } = useAuth();
  const { checkFeatureAccess } = useMembership();
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name, exp, streak, level")
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
              streak: item.streak || 0,
              avatar: initials.substring(0, 2).toUpperCase(),
              level: item.level || 1,
            };
          });
          setPeople(list);
        }
        setLoading(false);
      });
  }, []);

  const first = people[0] || null;
  const second = people[1] || null;
  const third = people[2] || null;

  const myRank = people.findIndex((p) => p.id === profile?.id) + 1;
  const myExp = profile?.exp || 0;
  
  // Calculate how much EXP to get to top 10
  const top10 = people[9];
  const targetExp = top10 ? top10.exp : 1000;
  const expDiff = Math.max(0, targetExp - myExp);
  const sessionsCount = Math.ceil(expDiff / 100);

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
          {["Hôm nay", "Tuần này", "Tháng này", "Tổng điểm"].map((tab, index) => (
            <button className={index === 1 ? "active" : ""} key={tab}>
              {tab}
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
                <div className={`podium-person second ${profile?.id === second.id ? "me" : ""}`}>
                  <span className="podium-avatar">{second.avatar}</span>
                  <i>2</i>
                  <strong>{second.name}</strong>
                  <small>{second.exp.toLocaleString("vi-VN")} EXP</small>
                  <div className="podium-block">2</div>
                </div>
              )}
              {first && (
                <div className={`podium-person first ${profile?.id === first.id ? "me" : ""}`}>
                  <Crown size={28} fill="currentColor" />
                  <span className="podium-avatar">{first.avatar}</span>
                  <i>1</i>
                  <strong>{first.name}</strong>
                  <small>{first.exp.toLocaleString("vi-VN")} EXP</small>
                  <div className="podium-block">1</div>
                </div>
              )}
              {third && (
                <div className={`podium-person third ${profile?.id === third.id ? "me" : ""}`}>
                  <span className="podium-avatar">{third.avatar}</span>
                  <i>3</i>
                  <strong>{third.name}</strong>
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
                  <span>GIẢI</span>
                  <span>STREAK</span>
                  <span>ĐIỂM TỔNG</span>
                </div>
                {people.length > 3 ? (
                  people.slice(3).map((person) => (
                    <div className={`ranking-row ${profile?.id === person.id ? "me" : ""}`} key={person.id}>
                      <b>#{person.rank}</b>
                      <div className="rank-person">
                        <span>{person.avatar}</span>
                        <div>
                          <strong>{person.name} {profile?.id === person.id && <i>Bạn</i>}</strong>
                          <small>Level {person.level}</small>
                        </div>
                      </div>
                      <span className="league-name"><Medal size={15} /> Vàng</span>
                      <span className="rank-streak"><Flame size={15} fill="currentColor" /> {person.streak} ngày</span>
                      <strong>{person.exp.toLocaleString("vi-VN")} <small>EXP</small></strong>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    Chưa có thêm người học khác.
                  </div>
                )}
              </section>

              <aside className="leader-rail">
                <div className="rail-card your-rank">
                  <div className="rank-big">
                    <Trophy size={22} />
                    <strong>{myRank > 0 ? `#${myRank}` : "N/A"}</strong>
                  </div>
                  {expDiff > 0 ? (
                    <>
                      <h3>Chỉ còn {expDiff.toLocaleString("vi-VN")} EXP để vào top 10!</h3>
                      <p>Hoàn thành khoảng {sessionsCount} phiên luyện nữa.</p>
                    </>
                  ) : (
                    <>
                      <h3>Chúc mừng! Bạn đang nằm trong top 10 dẫn đầu.</h3>
                      <p>Hãy giữ vững phong độ nhé!</p>
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
