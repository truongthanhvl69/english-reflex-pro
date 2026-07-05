import { playSentence as playTts, stopAudio as stopTts, type VoiceType } from "./ttsService";

export interface AudioSettingsState {
  effectsEnabled: boolean;       // Bật/tắt hiệu ứng đúng/sai
  autoPlayCorrect: boolean;      // Bật/tắt tự động phát đáp án đúng
  effectsVolume: number;         // Âm lượng hiệu ứng (0 to 1)
  voiceVolume: number;           // Âm lượng giọng đọc (0 to 1)
  speedRate: number;             // Tốc độ đọc: 0.75, 1, 1.25, 1.5
  voiceType: VoiceType;          // Chọn giọng đọc: Nam (male), Nữ (female), Anh-Mỹ (us), Anh-Anh (uk)
}

const DEFAULT_SETTINGS: AudioSettingsState = {
  effectsEnabled: true,
  autoPlayCorrect: true,
  effectsVolume: 0.8,
  voiceVolume: 1.0,
  speedRate: 1.0,
  voiceType: "us",
};

export function getAudioSettings(): AudioSettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("english_reflex_audio_settings");
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAudioSettings(settings: Partial<AudioSettingsState>) {
  if (typeof window === "undefined") return;
  try {
    const current = getAudioSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem("english_reflex_audio_settings", JSON.stringify(updated));
    // Dispatch a custom event to notify listeners
    window.dispatchEvent(new Event("audio_settings_changed"));
  } catch (err) {
    console.error("Lưu cài đặt âm thanh thất bại:", err);
  }
}

let activeEffectAudio: HTMLAudioElement | null = null;

// Synthesize pleasant Duolingo-like correct chime (using Web Audio API)
function playSynthesizedCorrect(volume: number) {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12 * volume, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    const now = ctx.currentTime;
    playTone(523.25, now, 0.12); // C5
    playTone(659.25, now + 0.06, 0.12); // E5
    playTone(783.99, now + 0.12, 0.25); // G5
  } catch (err) {
    console.error("Synthesizer error for correct chime:", err);
  }
}

// Synthesize pleasant soft wrong buzzer (using Web Audio API)
function playSynthesizedWrong(volume: number) {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const playTone = (freq: number, type: OscillatorType, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15 * volume, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    const now = ctx.currentTime;
    playTone(220, "triangle", now, 0.18); // A3
    playTone(207.65, "sawtooth", now + 0.05, 0.22); // G#3 (creating a gentle minor dissonance)
  } catch (err) {
    console.error("Synthesizer error for wrong buzzer:", err);
  }
}

export function playCorrectEffect(): Promise<void> {
  const settings = getAudioSettings();
  if (!settings.effectsEnabled) return Promise.resolve();

  stopAllAudio();

  return new Promise<void>((resolve) => {
    // Try to load /sounds/correct.mp3 from the public directory
    const audio = new Audio("/sounds/correct.mp3");
    audio.volume = settings.effectsVolume;
    activeEffectAudio = audio;
    
    const fallback = () => {
      playSynthesizedCorrect(settings.effectsVolume);
      setTimeout(resolve, 350);
    };

    audio.play()
      .then(() => {
        audio.onended = () => {
          if (activeEffectAudio === audio) activeEffectAudio = null;
          resolve();
        };
        // Safety timeout to avoid hanging if browser fails
        setTimeout(() => {
          if (activeEffectAudio === audio) {
            activeEffectAudio = null;
            resolve();
          }
        }, 1500);
      })
      .catch(() => {
        fallback();
      });
  });
}

export function playWrongEffect(): Promise<void> {
  const settings = getAudioSettings();
  if (!settings.effectsEnabled) return Promise.resolve();

  stopAllAudio();

  return new Promise<void>((resolve) => {
    const audio = new Audio("/sounds/wrong.mp3");
    audio.volume = settings.effectsVolume;
    activeEffectAudio = audio;

    const fallback = () => {
      playSynthesizedWrong(settings.effectsVolume);
      setTimeout(resolve, 350);
    };

    audio.play()
      .then(() => {
        audio.onended = () => {
          if (activeEffectAudio === audio) activeEffectAudio = null;
          resolve();
        };
        setTimeout(() => {
          if (activeEffectAudio === audio) {
            activeEffectAudio = null;
            resolve();
          }
        }, 1500);
      })
      .catch(() => {
        fallback();
      });
  });
}

export async function playSentenceAudio(sentenceId: string, text: string) {
  const settings = getAudioSettings();
  
  // Clean text by stripping unwanted formatting
  const cleanText = text.trim();

  // Call TTS service with settings
  return playTts(cleanText, {
    voiceType: settings.voiceType,
    speedRate: settings.speedRate,
    voiceVolume: settings.voiceVolume,
  });
}

export function stopAllAudio() {
  activeEffectAudio?.pause();
  activeEffectAudio = null;
  stopTts();
}

export async function playAnswerFeedback(options: {
  isCorrect: boolean;
  sentenceId: string;
  correctText: string;
}) {
  const { isCorrect, sentenceId, correctText } = options;
  const settings = getAudioSettings();

  stopAllAudio();

  // 1. Play correct/wrong sound effects first
  if (isCorrect) {
    await playCorrectEffect();
  } else {
    await playWrongEffect();
  }

  // 2. Play sentence audio
  if (settings.autoPlayCorrect) {
    try {
      await playSentenceAudio(sentenceId, correctText);
    } catch (err) {
      console.error("Không thể phát âm thanh của câu đúng sau khi phản hồi:", err);
    }
  }
}
