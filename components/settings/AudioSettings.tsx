"use client";

import { useEffect, useState } from "react";
import {
  AudioLines, Bot, Check, HelpCircle, Volume2, VolumeX, Zap,
} from "lucide-react";
import { MobileHeader } from "@/components/sidebar";
import { getAudioSettings, saveAudioSettings, type AudioSettingsState, stopAllAudio } from "@/services/audioManager";
import { playSentenceAudio } from "@/services/audioManager";
import { loadUserSettings, saveUserSettings } from "@/services/settingsService";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onMenu: () => void;
}

export function AudioSettings({ onMenu }: Props) {
  const { user, showToast } = useAuth();
  const [settings, setSettings] = useState<AudioSettingsState | null>(null);
  const [testPlaying, setTestPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    const localSettings = getAudioSettings();
    setSettings(localSettings);
    if (!user?.id) return;

    void loadUserSettings(user.id)
      .then((cloudSettings) => {
        if (!active || !cloudSettings) return;
        saveAudioSettings(cloudSettings);
        setSettings(cloudSettings);
      })
      .catch(() => showToast("Đang dùng cài đặt trên thiết bị vì chưa thể đồng bộ.", "info"));

    return () => { active = false; };
  }, [showToast, user?.id]);

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-400">
        Đang tải cấu hình...
      </div>
    );
  }

  const updateSetting = <K extends keyof AudioSettingsState>(key: K, value: AudioSettingsState[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveAudioSettings({ [key]: value });
    if (user?.id) {
      void saveUserSettings(user.id, updated).catch(() => {
        showToast("Cài đặt đã lưu trên thiết bị nhưng chưa thể đồng bộ.", "error");
      });
    }
  };

  const handleTestVoice = async () => {
    if (testPlaying) {
      stopAllAudio();
      setTestPlaying(false);
      return;
    }

    setTestPlaying(true);
    try {
      await playSentenceAudio("test-voice", "Welcome to English Reflex Pro. Keep practicing every day!");
    } catch (err) {
      console.error("Lỗi nghe thử giọng đọc:", err);
    } finally {
      setTestPlaying(false);
    }
  };

  return (
    <>
      <MobileHeader onMenu={onMenu} title="Cài đặt" />
      <div className="page settings-page">
        <header className="desktop-page-header">
          <div>
            <span className="eyebrow font-medium tracking-wider text-primary">CẤU HÌNH HỆ THỐNG</span>
            <h1>Cài đặt âm thanh</h1>
            <p>Tùy chỉnh hiệu ứng phản hồi và giọng đọc AI giúp tối ưu hóa phản xạ.</p>
          </div>
        </header>

        <div className="settings-grid">
          {/* Section: Hiệu ứng âm thanh */}
          <div className="settings-card">
            <div className="card-header">
              <Zap className="header-icon text-violet-500" size={20} />
              <div>
                <h3>Hiệu ứng âm thanh</h3>
                <p>Hiệu ứng báo đúng/sai khi nộp bài</p>
              </div>
            </div>

            <div className="card-body">
              {/* Toggle: Effects enabled */}
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Âm thanh phản hồi đúng/sai</strong>
                  <span>Phát tiếng chuông/còi báo kết quả lập tức</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.effectsEnabled}
                    onChange={(e) => updateSetting("effectsEnabled", e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              {/* Slider: Effects volume */}
              <div className={`setting-row-vertical ${!settings.effectsEnabled ? "disabled" : ""}`}>
                <div className="slider-header">
                  <span>Âm lượng hiệu ứng</span>
                  <b>{Math.round(settings.effectsVolume * 100)}%</b>
                </div>
                <div className="slider-control">
                  <VolumeX size={16} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={!settings.effectsEnabled}
                    value={settings.effectsVolume}
                    onChange={(e) => updateSetting("effectsVolume", parseFloat(e.target.value))}
                  />
                  <Volume2 size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Giọng đọc AI */}
          <div className="settings-card">
            <div className="card-header">
              <Bot className="header-icon text-blue-500" size={20} />
              <div>
                <h3>Giọng đọc AI (TTS)</h3>
                <p>Cấu hình giọng đọc mẫu câu tiếng Anh</p>
              </div>
            </div>

            <div className="card-body">
              {/* Toggle: Auto play correct */}
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Tự động đọc đáp án</strong>
                  <span>Phát âm thanh câu đúng sau khi trả lời</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.autoPlayCorrect}
                    onChange={(e) => updateSetting("autoPlayCorrect", e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              {/* Select: Voice Type */}
              <div className="setting-row select-row">
                <div className="setting-label">
                  <strong>Giọng đọc</strong>
                  <span>Chọn giới tính & giọng đọc của AI</span>
                </div>
                <select
                  value={settings.voiceType}
                  onChange={(e) => updateSetting("voiceType", e.target.value as AudioSettingsState["voiceType"])}
                  className="settings-select"
                >
                  <option value="female">Giọng Nữ chuẩn</option>
                  <option value="male">Giọng Nam chuẩn</option>
                  <option value="us">Anh - Mỹ (US Accent)</option>
                  <option value="uk">Anh - Anh (UK Accent)</option>
                </select>
              </div>

              {/* Select: Speed Rate */}
              <div className="setting-row select-row">
                <div className="setting-label">
                  <strong>Tốc độ đọc</strong>
                  <span>Tốc độ phát âm thanh</span>
                </div>
                <select
                  value={settings.speedRate}
                  onChange={(e) => updateSetting("speedRate", parseFloat(e.target.value))}
                  className="settings-select"
                >
                  <option value="0.75">0.75x (Chậm)</option>
                  <option value="1">1.0x (Bình thường)</option>
                  <option value="1.25">1.25x (Nhanh vừa)</option>
                  <option value="1.5">1.5x (Nhanh)</option>
                </select>
              </div>

              {/* Slider: Voice volume */}
              <div className="setting-row-vertical">
                <div className="slider-header">
                  <span>Âm lượng giọng đọc</span>
                  <b>{Math.round(settings.voiceVolume * 100)}%</b>
                </div>
                <div className="slider-control">
                  <VolumeX size={16} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.voiceVolume}
                    onChange={(e) => updateSetting("voiceVolume", parseFloat(e.target.value))}
                  />
                  <Volume2 size={16} className="text-gray-400" />
                </div>
              </div>

              {/* Button: Test Voice */}
              <div className="test-voice-action">
                <button
                  onClick={handleTestVoice}
                  className={`button ${testPlaying ? "button-secondary" : "button-primary"} w-full`}
                >
                  {testPlaying ? (
                    <>
                      <VolumeX size={16} /> Dừng nghe thử
                    </>
                  ) : (
                    <>
                      <AudioLines size={16} /> Nghe thử giọng đọc
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tip section */}
        <div className="settings-tip">
          <HelpCircle size={18} className="text-primary" />
          <p>
            <strong>Mẹo:</strong> Chế độ dự phòng tự động chuyển sang Web Speech API của trình duyệt khi máy chủ ngoại tuyến hoặc không có kết nối tới Google AI Studio.
          </p>
        </div>
      </div>
    </>
  );
}
