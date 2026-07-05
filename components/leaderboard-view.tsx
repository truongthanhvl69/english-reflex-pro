"use client";

import { Crown, Flame, Medal, ShieldCheck, Sparkles, Star, TrendingUp, Trophy } from "lucide-react";
import { MobileHeader } from "@/components/sidebar";

const people = [
  { rank: 1, name: "Linh Phạm", exp: "12,840", streak: 28, avatar: "LP", league: "Kim cương" },
  { rank: 2, name: "An Trần", exp: "11,960", streak: 18, avatar: "AT", league: "Kim cương" },
  { rank: 3, name: "Khoa Lê", exp: "10,720", streak: 16, avatar: "KL", league: "Bạch kim" },
  { rank: 4, name: "Thảo Vy", exp: "9,640", streak: 14, avatar: "TV", league: "Bạch kim" },
  { rank: 5, name: "Hoàng Nam", exp: "9,210", streak: 11, avatar: "HN", league: "Vàng" },
  { rank: 12, name: "Minh Nguyễn", exp: "8,420", streak: 7, avatar: "MN", league: "Vàng", me: true },
];

export function LeaderboardView({ onMenu }: { onMenu: () => void }) {
  return <><MobileHeader onMenu={onMenu} title="Xếp hạng" /><div className="page leaderboard-page"><header className="page-title-row"><div><span className="eyebrow">CỘNG ĐỒNG REFLEX</span><h1>Bảng xếp hạng</h1><p>Thi đua lành mạnh, cùng nhau giữ nhịp học mỗi ngày.</p></div><div className="league-chip"><ShieldCheck size={19} /><div><span>GIẢI HIỆN TẠI</span><b>Hạng Vàng</b></div></div></header>
    <div className="leader-tabs">{["Hôm nay", "Tuần này", "Tháng này", "Tổng điểm"].map((tab, index) => <button className={index === 1 ? "active" : ""} key={tab}>{tab}</button>)}</div>
    <section className="podium-card"><div className="podium-glow" /><div className="podium-person second"><span className="podium-avatar">AT</span><i>2</i><strong>An Trần</strong><small>11,960 EXP</small><div className="podium-block">2</div></div><div className="podium-person first"><Crown size={28} fill="currentColor" /><span className="podium-avatar">LP</span><i>1</i><strong>Linh Phạm</strong><small>12,840 EXP</small><div className="podium-block">1</div></div><div className="podium-person third"><span className="podium-avatar">KL</span><i>3</i><strong>Khoa Lê</strong><small>10,720 EXP</small><div className="podium-block">3</div></div></section>
    <div className="leader-content"><section className="ranking-table"><div className="ranking-head"><span>HẠNG</span><span>NGƯỜI HỌC</span><span>GIẢI</span><span>STREAK</span><span>ĐIỂM TUẦN</span></div>{people.slice(3).map((person) => <div className={`ranking-row ${person.me ? "me" : ""}`} key={person.rank}><b>#{person.rank}</b><div className="rank-person"><span>{person.avatar}</span><div><strong>{person.name} {person.me && <i>Bạn</i>}</strong><small>Level {person.rank === 12 ? 8 : 10}</small></div></div><span className="league-name"><Medal size={15} /> {person.league}</span><span className="rank-streak"><Flame size={15} fill="currentColor" /> {person.streak} ngày</span><strong>{person.exp} <small>EXP</small></strong></div>)}</section>
      <aside className="leader-rail"><div className="rail-card your-rank"><div className="rank-big"><Trophy size={22} /><strong>#12</strong></div><h3>Chỉ còn 790 EXP để vào top 10!</h3><p>Hoàn thành khoảng 6 phiên luyện nữa.</p><div><i style={{ width: "72%" }} /></div><span><b>8,420</b><small>9,210 EXP</small></span></div><div className="rail-card"><div className="rail-title simple"><div><h3>Thành tích mới</h3><p>Tuần này</p></div><Sparkles size={19} /></div><div className="achievement"><div>⚡</div><span><strong>Phản xạ thép</strong><small>50 câu đúng liên tiếp</small></span></div><div className="achievement"><div>🌅</div><span><strong>Chim sớm</strong><small>Học trước 7 giờ sáng</small></span></div></div></aside>
    </div><div className="promotion-banner"><TrendingUp size={22} /><div><strong>Top 15 sẽ thăng hạng Bạch kim</strong><span>Giải tuần kết thúc sau 2 ngày 14 giờ</span></div><Star size={22} fill="currentColor" /></div>
  </div></>;
}
