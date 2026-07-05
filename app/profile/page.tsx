"use client";

import { ArrowLeft, CheckCircle2, Flame, LogOut, ShieldCheck, Star, Target, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";

function ProfileContent() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const name = profile?.full_name || user?.user_metadata.name || "Learner";

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <button className="profile-back" onClick={() => router.push("/")}><ArrowLeft size={17} /> Quay lại học</button>
        <section className="profile-hero">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="profile-avatar-fallback">{name.slice(0, 1).toUpperCase()}</div>
          )}
          <div>
            <span className="eyebrow">HỒ SƠ CÁ NHÂN</span>
            <h1>Xin chào, {name}</h1>
            <p>{profile?.email || user?.email}</p>
          </div>
          <span className="account-plan"><ShieldCheck size={15} /> Gói {profile?.subscription_tier === "pro" ? "Pro" : "Miễn phí"}</span>
        </section>

        <section className="profile-stats">
          <div><Star size={21} /><span>Tổng EXP</span><strong>{(profile?.exp ?? 0).toLocaleString("vi-VN")}</strong></div>
          <div><Flame size={21} /><span>Streak</span><strong>{profile?.streak ?? 0} ngày</strong></div>
          <div><Target size={21} /><span>Accuracy</span><strong>{Number(profile?.accuracy ?? 0).toFixed(1)}%</strong></div>
          <div><Trophy size={21} /><span>Cấp độ</span><strong>Level {profile?.level ?? 1}</strong></div>
        </section>

        <section className="profile-details">
          <div>
            <h2>Dữ liệu học tập</h2>
            <p><CheckCircle2 size={16} /> {profile?.correct_answers ?? 0} câu đúng trên {profile?.total_answers ?? 0} lượt trả lời</p>
            <p><CheckCircle2 size={16} /> Tiến trình, lịch sử và cài đặt âm thanh đang đồng bộ bằng Supabase</p>
          </div>
          <button className="profile-logout" onClick={() => void signOut()}><LogOut size={17} /> Đăng xuất</button>
        </section>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}
