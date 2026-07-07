"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bell, BookOpen, Check, ShieldCheck, Star, Target, Trophy,
  User, Shield, CreditCard, Award, Settings, LogOut, LoaderCircle, Flame,
  Upload, Sparkles, AlertTriangle, Eye, RefreshCw, KeyRound, Mail, Clock
} from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { ProfileService } from "@/services/profileService";
import { SecurityService } from "@/services/securityService";
import { AvatarService } from "@/services/avatarService";
import { MembershipService } from "@/services/membershipService";
import { PaymentHistoryService } from "@/services/paymentHistoryService";
import { UserAvatar } from "@/components/common/UserAvatar";

type ProfileTab = "overview" | "account" | "security" | "achievements" | "billing" | "settings";

function ProfileContent() {
  const { profile, user, signOut, refreshProfile, showToast } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [loading, setLoading] = useState(false);

  // Profile fields state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("VN");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [language, setLanguage] = useState("vi");

  // Notifications toggles
  const [studyAlerts, setStudyAlerts] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [achievementsNotif, setAchievementsNotif] = useState(true);
  const [promotionsNotif, setPromotionsNotif] = useState(true);

  // Privacy toggles
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showStreak, setShowStreak] = useState(true);
  const [showLevel, setShowLevel] = useState(true);

  // Statistics state
  const [stats, setStats] = useState({
    completedLessons: 0,
    totalSentences: 0,
    totalTimeSec: 0,
    vocabMemorized: 0
  });
  
  // Leaderboard ranking state
  const [myRank, setMyRank] = useState<number | null>(null);

  // Billing state
  const [membership, setMembership] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  // Avatar uploader state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Security modals / inputs
  const [newEmail, setNewEmail] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [userAgentInfo, setUserAgentInfo] = useState("");

  // Sync profile data to state variables
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setCountry(profile.country || "VN");
      setTimezone(profile.timezone || "Asia/Ho_Chi_Minh");
      setLanguage(profile.language || "vi");

      // Load settings
      setStudyAlerts(profile.notification_study_alerts !== false);
      setEmailReminders(profile.notification_email_reminders !== false);
      setAchievementsNotif(profile.notification_achievements !== false);
      setPromotionsNotif(profile.notification_promotions !== false);

      setShowOnLeaderboard(profile.privacy_show_on_leaderboard !== false);
      setPublicProfile(profile.privacy_public_profile !== false);
      setShowStreak(profile.privacy_show_streak !== false);
      setShowLevel(profile.privacy_show_level !== false);
    }
  }, [profile]);

  // Load stats and billing details on tab load
  useEffect(() => {
    if (!user?.id) return;

    // Load statistics
    ProfileService.getProfileStats(user.id)
      .then(setStats)
      .catch((err) => console.error("Error loading stats:", err));

    // Load billing
    MembershipService.getMembership(user.id)
      .then(setMembership)
      .catch((err) => console.error("Error loading membership:", err));

    PaymentHistoryService.getPaymentHistory(user.id)
      .then(setPayments)
      .catch((err) => console.error("Error loading payments:", err));

    // Load dynamic ranking from leaderboard
    supabase
      .from("leaderboard_total")
      .select("user_id, rank")
      .then(({ data }) => {
        if (data) {
          const myPos = data.find((p) => p.user_id === user.id);
          if (myPos) setMyRank(myPos.rank);
        }
      });

    // Detect browser user agent for Security Session tab
    if (typeof window !== "undefined" && window.navigator) {
      const ua = navigator.userAgent;
      let browser = "Trình duyệt Web";
      let os = "Hệ điều hành";
      if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari")) browser = "Safari";
      
      if (ua.includes("Windows")) os = "Windows";
      else if (ua.includes("Mac")) os = "MacOS";
      else if (ua.includes("Linux")) os = "Linux";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
      
      setUserAgentInfo(`${browser} (${os})`);
    }
  }, [user?.id]);

  // Redraw cropped avatar preview on canvas
  useEffect(() => {
    if (!previewSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = previewSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      ctx.restore();
    };
  }, [previewSrc, zoom, rotation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast("Kích thước hình ảnh vượt quá 5MB. Vui lòng chọn ảnh khác.", "error");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewSrc(reader.result as string);
        setZoom(1);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveAvatar = () => {
    if (!canvasRef.current || !user?.id) return;
    setSavingAvatar(true);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        setSavingAvatar(false);
        return;
      }
      const croppedFile = new File([blob], "avatar.png", { type: "image/png" });
      try {
        const publicUrl = await AvatarService.uploadAvatar(user.id, croppedFile);
        showToast("Cập nhật ảnh đại diện thành công.", "success");
        await refreshProfile();
        setPreviewSrc(null);
      } catch (err: any) {
        showToast(err.message || "Không thể tải ảnh lên, vui lòng thử lại.", "error");
      } finally {
        setSavingAvatar(false);
      }
    }, "image/png");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    try {
      await ProfileService.updateProfile(user.id, {
        full_name: fullName,
        username: username || undefined,
        bio,
        country,
        timezone,
        language
      });
      showToast("Cập nhật hồ sơ thành công.", "success");
      await refreshProfile();
    } catch (err: any) {
      showToast(err.message || "Lỗi khi cập nhật hồ sơ.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: any) => {
    if (!user?.id) return;
    try {
      await ProfileService.updateProfile(user.id, updates);
      showToast("Đã lưu thiết lập thành công.", "success");
      await refreshProfile();
    } catch (err: any) {
      showToast(err.message || "Không thể lưu cài đặt.", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    setLoading(true);
    try {
      await SecurityService.sendPasswordResetEmail(profile.email);
      showToast("Chúng tôi đã gửi email đổi mật khẩu. Vui lòng kiểm tra Gmail.", "success");
      setShowResetPasswordModal(false);
    } catch (err: any) {
      showToast(err.message || "Không thể gửi email đặt lại mật khẩu.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setLoading(true);
    try {
      await SecurityService.requestEmailChange(newEmail);
      showToast("Email xác nhận đã được gửi đến hòm thư mới. Vui lòng kiểm tra.", "success");
      setNewEmail("");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi đổi địa chỉ email.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoading(true);
    try {
      await SecurityService.logOutAllDevices();
      showToast("Đã đăng xuất thành công khỏi tất cả các thiết bị.", "success");
      router.push("/login");
    } catch (err: any) {
      showToast(err.message || "Không thể đăng xuất tất cả.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !user?.id) return;
    setLoading(true);
    try {
      await SecurityService.requestAccountDeletion(user.id);
      showToast("Yêu cầu xóa tài khoản đã được ghi nhận. Chúng tôi sẽ gửi email xác nhận.", "success");
      setShowDeleteModal(false);
      setDeleteConfirmText("");
      await signOut();
      router.push("/login");
    } catch (err: any) {
      showToast(err.message || "Lỗi khi gửi yêu cầu xóa tài khoản.", "error");
    } finally {
      setLoading(false);
    }
  };

  const name = profile?.full_name || user?.user_metadata.name || "Learner";
  const tier = membership?.membership_type || "free";
  const initials = getInitials(name).substring(0, 2).toUpperCase();

  return (
    <main className="profile-dashboard">
      {/* Sidebar Navigation */}
      <aside className="profile-sidebar">
        <h2 className="profile-sidebar-title">Bảng điều khiển</h2>
        <button 
          className={`profile-menu-item ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BookOpen size={16} /> Tổng quan
        </button>
        <button 
          className={`profile-menu-item ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <User size={16} /> Tài khoản
        </button>
        <button 
          className={`profile-menu-item ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <Shield size={16} /> Bảo mật
        </button>
        <button 
          className={`profile-menu-item ${activeTab === "achievements" ? "active" : ""}`}
          onClick={() => setActiveTab("achievements")}
        >
          <Award size={16} /> Thành tích
        </button>
        <button 
          className={`profile-menu-item ${activeTab === "billing" ? "active" : ""}`}
          onClick={() => setActiveTab("billing")}
        >
          <CreditCard size={16} /> Thanh toán
        </button>
        <button 
          className={`profile-menu-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <Settings size={16} /> Cài đặt
        </button>
        
        <div style={{ marginTop: "auto", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
          <button className="profile-menu-item" onClick={() => router.push("/")} style={{ color: "#64748b" }}>
            <ArrowLeft size={16} /> Quay lại học
          </button>
          <button className="profile-menu-item" onClick={() => void signOut()} style={{ color: "#ef4444" }}>
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="profile-main-content">
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div>
            <div className="profile-tab-header">
              <h1>Hồ sơ cá nhân</h1>
              <p>Chào mừng quay lại, {name}! Dưới đây là tóm tắt chặng đường học tập của bạn.</p>
            </div>

            {/* Account Info Panel */}
            <div className="profile-card-panel" style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <UserAvatar avatarUrl={profile?.avatar_url} fullName={name} email={profile?.email} size={96} />
                <span style={{ position: "absolute", bottom: 0, right: 0, background: "#20b486", color: "white", padding: "4px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
                  {tier}
                </span>
              </div>
              <div style={{ flexGrow: 1 }}>
                <h2 style={{ margin: 0, fontSize: "22px" }}>{name}</h2>
                <p style={{ margin: "2px 0 6px 0", color: "#64748b" }}>{profile?.email || user?.email}</p>
                <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748b" }}>
                  <span>Tham gia: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN") : "Hôm nay"}</span>
                  <span>•</span>
                  <span>Hoạt động: {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleDateString("vi-VN") : "Hôm nay"}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="profile-stats-dashboard" style={{ marginBottom: "24px" }}>
              <div className="profile-stat-box">
                <Star size={20} style={{ color: "#eab308" }} />
                <span>TỔNG EXP</span>
                <strong>{(profile?.exp ?? 0).toLocaleString("vi-VN")}</strong>
              </div>
              <div className="profile-stat-box">
                <Flame size={20} style={{ color: "#ef4444" }} />
                <span>STREAK HIỆN TẠI</span>
                <strong>{profile?.streak ?? 0} ngày</strong>
              </div>
              <div className="profile-stat-box">
                <Target size={20} style={{ color: "#22c55e" }} />
                <span>TỶ LỆ ĐÚNG</span>
                <strong>{Number(profile?.accuracy ?? 0).toFixed(1)}%</strong>
              </div>
              <div className="profile-stat-box">
                <Trophy size={20} style={{ color: "#3b82f6" }} />
                <span>XẾP HẠNG TUẦN</span>
                <strong>{myRank ? `#${myRank}` : "N/A"}</strong>
              </div>
            </div>

            {/* Detailed Learning Stats */}
            <div className="profile-card-panel">
              <h2>Thống kê chi tiết</h2>
              <div className="profile-stats-dashboard">
                <div className="profile-stat-box" style={{ background: "transparent" }}>
                  <span>Bài học đã hoàn thành</span>
                  <strong>{stats.completedLessons} bài</strong>
                </div>
                <div className="profile-stat-box" style={{ background: "transparent" }}>
                  <span>Câu phản xạ đã học</span>
                  <strong>{stats.totalSentences} câu</strong>
                </div>
                <div className="profile-stat-box" style={{ background: "transparent" }}>
                  <span>Tổng thời gian luyện</span>
                  <strong>{Math.round(stats.totalTimeSec / 60)} phút</strong>
                </div>
                <div className="profile-stat-box" style={{ background: "transparent" }}>
                  <span>Từ vựng tích lũy</span>
                  <strong>{stats.vocabMemorized} từ</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Account Editing */}
        {activeTab === "account" && (
          <div>
            <div className="profile-tab-header">
              <h1>Thông tin tài khoản</h1>
              <p>Cập nhật tên hiển thị, tên người dùng, avatar và các thông tin cá nhân của bạn.</p>
            </div>

            {/* Avatar Upload Panel */}
            <div className="profile-card-panel">
              <h2>Ảnh đại diện</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                <UserAvatar avatarUrl={profile?.avatar_url} fullName={name} email={profile?.email} size={80} />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label className="button button-secondary" style={{ cursor: "pointer", display: "inline-flex", gap: "8px", alignItems: "center" }}>
                    <Upload size={15} /> Tải ảnh mới
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/webp" 
                      onChange={handleFileChange} 
                      style={{ display: "none" }} 
                    />
                  </label>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>PNG, JPG hoặc WEBP. Tối đa 5MB.</span>
                </div>
              </div>
            </div>

            {/* Details Edit Form */}
            <div className="profile-card-panel">
              <h2>Cập nhật thông tin</h2>
              <form onSubmit={handleUpdateProfile} className="profile-form-grid" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="profile-form-grid">
                  <div className="profile-field-group">
                    <label>Họ và tên</label>
                    <input 
                      type="text" 
                      className="profile-input-text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyen Van A"
                      required
                    />
                  </div>
                  <div className="profile-field-group">
                    <label>Tên người dùng (Username)</label>
                    <input 
                      type="text" 
                      className="profile-input-text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="profile-field-group">
                  <label>Mô tả bản thân (Bio)</label>
                  <textarea 
                    className="profile-input-text profile-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Giới thiệu ngắn về bản thân bạn..."
                  />
                </div>

                <div className="profile-form-grid">
                  <div className="profile-field-group">
                    <label>Quốc gia</label>
                    <select 
                      className="profile-select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="VN">Việt Nam</option>
                      <option value="US">Mỹ (United States)</option>
                      <option value="UK">Anh Quốc</option>
                      <option value="JP">Nhật Bản</option>
                      <option value="KR">Hàn Quốc</option>
                    </select>
                  </div>
                  <div className="profile-field-group">
                    <label>Múi giờ</label>
                    <select 
                      className="profile-select"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                      <option value="UTC">Múi giờ quốc tế (UTC)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="button button-primary" 
                  disabled={loading}
                  style={{ alignSelf: "flex-start", minWidth: "140px" }}
                >
                  {loading ? <LoaderCircle className="spin" size={16} /> : "Lưu thay đổi"}
                </button>
              </form>
            </div>

            {/* Change Email Panel */}
            <div className="profile-card-panel">
              <h2>Đổi địa chỉ Email</h2>
              <form onSubmit={handleEmailChange} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                  Để thay đổi email đăng nhập, vui lòng nhập địa chỉ email mới. Một liên kết xác nhận sẽ được gửi tới email đó.
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div className="profile-field-group" style={{ flexGrow: 1, maxWidth: "340px" }}>
                    <label>Email mới</label>
                    <input 
                      type="email" 
                      className="profile-input-text"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email@gmail.com"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="button button-secondary"
                    disabled={loading || !newEmail.trim()}
                    style={{ height: "42px" }}
                  >
                    Gửi xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Session */}
        {activeTab === "security" && (
          <div>
            <div className="profile-tab-header">
              <h1>Bảo mật & Thiết bị</h1>
              <p>Quản lý mật khẩu tài khoản và các phiên đăng nhập đang hoạt động của bạn.</p>
            </div>

            {/* Password Reset Trigger */}
            <div className="profile-card-panel">
              <h2>Mật khẩu tài khoản</h2>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <strong style={{ display: "block", fontSize: "14px" }}>Thay đổi mật khẩu</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Gửi liên kết khôi phục mật khẩu vào hòm thư Gmail của bạn.</span>
                </div>
                <button 
                  className="button button-secondary"
                  onClick={() => setShowResetPasswordModal(true)}
                  disabled={loading}
                >
                  Yêu cầu đổi mật khẩu
                </button>
              </div>
            </div>

            {/* Active Sessions Panel */}
            <div className="profile-card-panel">
              <h2>Quản lý phiên đăng nhập</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "14px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ background: "rgba(32, 180, 134, 0.1)", color: "#20b486", padding: "8px", borderRadius: "8px" }}>
                      <Eye size={18} />
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "14px" }}>Thiết bị hiện tại: {userAgentInfo}</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>IP: 115.73.***.*** · Đang hoạt động</span>
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", color: "#20b486", fontWeight: "bold", alignSelf: "center" }}>Phiên chính</span>
                </div>

                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: "14px" }}>Đăng xuất khỏi tất cả thiết bị</strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Ngăn chặn truy cập trái phép bằng cách thu hồi mọi phiên đăng nhập khác.</span>
                  </div>
                  <button 
                    className="button"
                    style={{ background: "#fff5f5", color: "#ef4444", border: "1px solid #ffe4e6" }}
                    onClick={handleLogoutAll}
                    disabled={loading}
                  >
                    Đăng xuất tất cả
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="profile-card-panel" style={{ border: "1px solid #ffe4e6", background: "#fffafb" }}>
              <h2 style={{ color: "#b91c1c" }}>Vùng nguy hiểm</h2>
              <p style={{ fontSize: "13px", color: "#7f1d1d", margin: "0 0 16px 0" }}>
                Xóa tài khoản là hành động vĩnh viễn và không thể khôi phục lại bất kỳ dữ liệu học tập hay lịch sử điểm số nào.
              </p>
              <button 
                className="button"
                style={{ background: "#ef4444", color: "white" }}
                onClick={() => setShowDeleteModal(true)}
              >
                Xóa tài khoản của tôi
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Achievements */}
        {activeTab === "achievements" && (
          <div>
            <div className="profile-tab-header">
              <h1>Danh hiệu & Thành tích</h1>
              <p>Mở khóa các huy hiệu khi hoàn thành các mục tiêu học tập phản xạ tiếng Anh.</p>
            </div>

            <div className="profile-stats-dashboard" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {/* Badge 1: 7 days streak */}
              <div className="profile-card-panel" style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: 0 }}>
                <div style={{ fontSize: "40px", background: "#fff7ed", padding: "12px", borderRadius: "16px", border: "1px solid #fed7aa" }}>🔥</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Nhịp Học Thép</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Duy trì học liên tiếp trong 7 ngày.</p>
                  <span style={{ fontSize: "11px", color: (profile?.streak ?? 0) >= 7 ? "#20b486" : "#64748b", fontWeight: "bold", display: "block", marginTop: "4px" }}>
                    {(profile?.streak ?? 0) >= 7 ? "✓ Đã mở khóa" : `Tiến độ: ${profile?.streak ?? 0}/7 ngày`}
                  </span>
                </div>
              </div>

              {/* Badge 2: 100 correct answers */}
              <div className="profile-card-panel" style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: 0 }}>
                <div style={{ fontSize: "40px", background: "#ecfdf5", padding: "12px", borderRadius: "16px", border: "1px solid #a7f3d0" }}>🎯</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Phản Xạ Vàng</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Đạt 100 câu trả lời đúng.</p>
                  <span style={{ fontSize: "11px", color: (profile?.correct_answers ?? 0) >= 100 ? "#20b486" : "#64748b", fontWeight: "bold", display: "block", marginTop: "4px" }}>
                    {(profile?.correct_answers ?? 0) >= 100 ? "✓ Đã mở khóa" : `Tiến độ: ${profile?.correct_answers ?? 0}/100 câu`}
                  </span>
                </div>
              </div>

              {/* Badge 3: 1000 exp */}
              <div className="profile-card-panel" style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: 0 }}>
                <div style={{ fontSize: "40px", background: "#f5f3ff", padding: "12px", borderRadius: "16px", border: "1px solid #ddd6fe" }}>⚡</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Kiện Tướng EXP</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Tích lũy tổng cộng 1.000 EXP.</p>
                  <span style={{ fontSize: "11px", color: (profile?.exp ?? 0) >= 1000 ? "#20b486" : "#64748b", fontWeight: "bold", display: "block", marginTop: "4px" }}>
                    {(profile?.exp ?? 0) >= 1000 ? "✓ Đã mở khóa" : `Tiến độ: ${profile?.exp ?? 0}/1.000`}
                  </span>
                </div>
              </div>

              {/* Badge 4: Level 10 */}
              <div className="profile-card-panel" style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: 0 }}>
                <div style={{ fontSize: "40px", background: "#eff6ff", padding: "12px", borderRadius: "16px", border: "1px solid #bfdbfe" }}>🏆</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Chinh Phục Đỉnh Cao</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>Đạt cấp độ học tập Level 10.</p>
                  <span style={{ fontSize: "11px", color: (profile?.level ?? 1) >= 10 ? "#20b486" : "#64748b", fontWeight: "bold", display: "block", marginTop: "4px" }}>
                    {(profile?.level ?? 1) >= 10 ? "✓ Đã mở khóa" : `Tiến độ: Level ${profile?.level ?? 1}/10`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Subscription Billing & Payment Logs */}
        {activeTab === "billing" && (
          <div>
            <div className="profile-tab-header">
              <h1>Gói thành viên & Thanh toán</h1>
              <p>Quản lý gói tài khoản đang sử dụng và kiểm tra lịch sử thanh toán hóa đơn.</p>
            </div>

            {/* Membership status card */}
            <div className="profile-card-panel">
              <h2>Gói dịch vụ hiện tại</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Tên gói</span>
                  <strong style={{ fontSize: "15px", color: "#0f172a", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                    {tier === "free" ? "Free Member" : `${tier.toUpperCase()} MEMBER`}
                    {tier !== "free" && <Star size={14} fill="#20b486" style={{ color: "#20b486" }} />}
                  </strong>
                </div>
                <div style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Ngày đăng ký</span>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                    {membership?.started_at ? new Date(membership.started_at).toLocaleDateString("vi-VN") : "N/A"}
                  </strong>
                </div>
                <div style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Ngày hết hạn</span>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                    {membership?.expired_at ? new Date(membership.expired_at).toLocaleDateString("vi-VN") : "Vô hạn"}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {tier === "free" ? (
                  <button className="button button-primary" onClick={() => router.push("/pricing")}>
                    🚀 Nâng cấp PRO ngay
                  </button>
                ) : (
                  <>
                    <button className="button button-secondary" onClick={() => router.push("/pricing")}>
                      Gia hạn tài khoản
                    </button>
                    {membership?.status === "active" && (
                      <button 
                        className="button"
                        style={{ background: "#fff5f5", color: "#ef4444", border: "1px solid #ffe4e6" }}
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await MembershipService.cancelSubscription(user?.id || "");
                            showToast("Đã hủy tự động gia hạn thành công.", "success");
                            const m = await MembershipService.getMembership(user?.id || "");
                            setMembership(m);
                          } catch (err: any) {
                            showToast(err.message || "Lỗi khi hủy gia hạn.", "error");
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        Hủy tự động gia hạn
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Payment history table */}
            <div className="profile-card-panel">
              <h2>Lịch sử giao dịch</h2>
              {payments.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Bạn chưa thực hiện bất kỳ giao dịch thanh toán nào.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <th style={{ padding: "12px 8px" }}>Ngày</th>
                        <th style={{ padding: "12px 8px" }}>Số tiền</th>
                        <th style={{ padding: "12px 8px" }}>Gói dịch vụ</th>
                        <th style={{ padding: "12px 8px" }}>Cổng toán</th>
                        <th style={{ padding: "12px 8px" }}>Mã GD</th>
                        <th style={{ padding: "12px 8px" }}>Hóa đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px 8px" }}>{new Date(p.created_at).toLocaleDateString("vi-VN")}</td>
                          <td style={{ padding: "12px 8px", fontWeight: "bold" }}>
                            {Number(p.amount).toLocaleString("vi-VN")} {p.currency}
                          </td>
                          <td style={{ padding: "12px 8px", textTransform: "uppercase" }}>{p.plan_id ? p.plan_id.toUpperCase().replace("_", " ") : "N/A"}</td>
                          <td style={{ padding: "12px 8px", textTransform: "capitalize" }}>{p.provider}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <code style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                              {p.transaction_id ? p.transaction_id.slice(0, 14) + "..." : "N/A"}
                            </code>
                          </td>
                          <td style={{ padding: "12px 8px" }}>
                            <button 
                              className="text-button" 
                              style={{ fontSize: "12px", fontWeight: "bold" }}
                              onClick={() => {
                                showToast("Đang chuẩn bị tải hóa đơn định dạng PDF...", "info");
                              }}
                            >
                              Xem hóa đơn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Notifications & Privacy Toggles */}
        {activeTab === "settings" && (
          <div>
            <div className="profile-tab-header">
              <h1>Cài đặt chung</h1>
              <p>Quản lý các thông báo nhận được và quyền riêng tư hiển thị của tài khoản.</p>
            </div>

            {/* Notification settings */}
            <div className="profile-card-panel">
              <h2>Cài đặt thông báo</h2>
              
              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Thông báo nhắc học tập</strong>
                  <p>Bật thông báo trên thiết bị để không bỏ lỡ lịch học mỗi ngày.</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={studyAlerts}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setStudyAlerts(val);
                    void handleUpdateSettings({ notification_study_alerts: val });
                  }}
                  aria-label="Thông báo học tập"
                />
              </div>

              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Email nhắc học tập</strong>
                  <p>Gửi thư điện tử nhắc nhở khi bạn sắp bị ngắt chuỗi ngày học (streak).</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={emailReminders}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setEmailReminders(val);
                    void handleUpdateSettings({ notification_email_reminders: val });
                  }}
                  aria-label="Email nhắc học tập"
                />
              </div>

              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Thông báo thành tích</strong>
                  <p>Nhận thông báo chúc mừng khi bạn mở khóa danh hiệu thành tích mới.</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={achievementsNotif}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAchievementsNotif(val);
                    void handleUpdateSettings({ notification_achievements: val });
                  }}
                  aria-label="Thông báo thành tích"
                />
              </div>

              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Thông báo khuyến mãi</strong>
                  <p>Cập nhật các chương trình ưu đãi nâng cấp tài khoản PRO sớm nhất.</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={promotionsNotif}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setPromotionsNotif(val);
                    void handleUpdateSettings({ notification_promotions: val });
                  }}
                  aria-label="Thông báo khuyến mãi"
                />
              </div>
            </div>

            {/* Privacy settings */}
            <div className="profile-card-panel">
              <h2>Bảo mật & Riêng tư</h2>

              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Hiển thị trên Bảng xếp hạng</strong>
                  <p>Cho phép hiển thị tài khoản và điểm EXP của bạn trên bảng xếp hạng chung.</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={showOnLeaderboard}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setShowOnLeaderboard(val);
                    void handleUpdateSettings({ privacy_show_on_leaderboard: val });
                  }}
                  aria-label="Hiển thị trên Leaderboard"
                />
              </div>

              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Hồ sơ công khai</strong>
                  <p>Cho phép những người học khác click vào xem thông tin và thành tích học tập của bạn.</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={publicProfile}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setPublicProfile(val);
                    void handleUpdateSettings({ privacy_public_profile: val });
                  }}
                  aria-label="Cho phép xem hồ sơ công khai"
                />
              </div>

              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Hiển thị số ngày học liên tiếp (Streak)</strong>
                  <p>Bật hiển thị huy hiệu ngọn lửa streak trên hồ sơ công khai của bạn.</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={showStreak}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setShowStreak(val);
                    void handleUpdateSettings({ privacy_show_streak: val });
                  }}
                  aria-label="Hiển thị ngọn lửa streak"
                />
              </div>

              <div className="switch-setting-row">
                <div className="switch-setting-label">
                  <strong>Hiển thị cấp độ học tập (Level)</strong>
                  <p>Bật hiển thị cấp độ hiện tại để mọi người cùng nhìn thấy.</p>
                </div>
                <input 
                  type="checkbox"
                  className="toggle-switch"
                  checked={showLevel}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setShowLevel(val);
                    void handleUpdateSettings({ privacy_show_level: val });
                  }}
                  aria-label="Hiển thị cấp độ"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MODAL 1: Image Canvas Zoom & Rotate Cropper */}
      {previewSrc && (
        <div className="avatar-cropper-modal">
          <div className="avatar-cropper-content">
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Điều chỉnh ảnh đại diện</h3>
            <div className="canvas-container">
              <canvas 
                ref={canvasRef} 
                width={200} 
                height={200} 
                style={{ borderRadius: "50%", background: "#e2e8f0", objectFit: "cover" }} 
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600" }}>
                <span>Thu phóng (Zoom)</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                aria-label="Thanh trượt thu phóng ảnh đại diện"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button 
                className="button button-secondary"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <RefreshCw size={13} /> Xoay ảnh 90°
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button 
                className="button" 
                onClick={() => setPreviewSrc(null)}
                disabled={savingAvatar}
              >
                Hủy bỏ
              </button>
              <button 
                className="button button-primary"
                onClick={saveAvatar}
                disabled={savingAvatar}
              >
                {savingAvatar ? <LoaderCircle className="spin" size={16} /> : "Cắt & Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Password Reset Confirmation */}
      {showResetPasswordModal && (
        <div className="avatar-cropper-modal">
          <div className="avatar-cropper-content" style={{ maxWidth: "380px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "#eab308" }}>
              <KeyRound size={24} />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Xác nhận đặt lại mật khẩu</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
              Bạn có chắc chắn muốn nhận email hướng dẫn đặt lại mật khẩu tài khoản mới vào hòm thư Gmail của mình?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="button" onClick={() => setShowResetPasswordModal(false)}>Hủy</button>
              <button className="button button-primary" onClick={handleResetPassword}>Đồng ý</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Account Deletion Double Confirm */}
      {showDeleteModal && (
        <div className="avatar-cropper-modal">
          <div className="avatar-cropper-content" style={{ maxWidth: "380px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "#ef4444" }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>CẢNH BÁO XÓA TÀI KHOẢN</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.6" }}>
              Hành động này không thể hoàn tác. Để tiếp tục, vui lòng nhập chữ <strong style={{ color: "#ef4444" }}>DELETE</strong> bên dưới:
            </p>
            <input 
              type="text"
              className="profile-input-text"
              placeholder="Nhập DELETE để xác nhận"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              aria-label="Xác nhận từ khóa DELETE"
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}>Hủy bỏ</button>
              <button 
                className="button"
                style={{ background: deleteConfirmText === "DELETE" ? "#ef4444" : "#fca5a5", color: "white", cursor: deleteConfirmText === "DELETE" ? "pointer" : "not-allowed" }}
                disabled={deleteConfirmText !== "DELETE"}
                onClick={handleDeleteAccount}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function getInitials(name: string) {
  const names = name.trim().split(/\s+/);
  if (names.length === 0) return "LN";
  return names.length > 1 ? names[0][0] + names[names.length - 1][0] : names[0][0];
}

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}
