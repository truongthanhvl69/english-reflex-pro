export type VoiceType = "male" | "female" | "us" | "uk";

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export async function playSentence(
  text: string,
  options: {
    voiceType: VoiceType;
    speedRate: number;
    voiceVolume: number;
  }
) {
  const { voiceType, speedRate, voiceVolume } = options;

  // Stop any active audio and speech synthesis
  activeAudio?.pause();
  activeAudio = null;

  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }

  // Map settings to API payload
  let voice: "Charon" | "Kore" = "Kore";
  let accent: "us" | "uk" = "us";

  if (voiceType === "male") {
    voice = "Charon";
  } else if (voiceType === "female") {
    voice = "Kore";
  } else if (voiceType === "us") {
    voice = "Kore";
    accent = "us";
  } else if (voiceType === "uk") {
    voice = "Kore";
    accent = "uk";
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, accent }),
    });

    if (response.ok) {
      const { audioUrl } = (await response.json()) as { audioUrl: string };
      activeAudio = new Audio(audioUrl);
      activeAudio.playbackRate = speedRate;
      activeAudio.volume = voiceVolume;
      await activeAudio.play();
      return activeAudio;
    }

    const payload = await response.json().catch(() => ({}));
    console.warn("Không sử dụng được Gemini TTS, chuyển sang Web Speech API:", payload.error);
  } catch (error) {
    console.warn("Lỗi gọi API tts, chuyển sang Web Speech API:", error);
  }

  // Fallback to Web Speech API (Browser default voice)
  if (typeof window !== "undefined" && window.speechSynthesis) {
    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Map Lang
      utterance.lang = voiceType === "uk" ? "en-GB" : "en-US";
      utterance.rate = speedRate;
      utterance.volume = voiceVolume;

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      if (voiceType === "male") {
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            v.name.toLowerCase().includes("male") &&
            !v.name.toLowerCase().includes("female")
        );
      } else if (voiceType === "female") {
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("zira") ||
              v.name.toLowerCase().includes("google us english"))
        );
      } else if (voiceType === "uk") {
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en-GB") ||
            (v.lang.startsWith("en") && v.name.toLowerCase().includes("uk") || v.name.toLowerCase().includes("great britain"))
        );
      } else if (voiceType === "us") {
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en-US") ||
            (v.lang.startsWith("en") && v.name.toLowerCase().includes("us") || v.name.toLowerCase().includes("united states"))
        );
      }

      // Default fallback english voice if not found
      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.lang.startsWith("en"));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        activeUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        activeUtterance = null;
        if (e.error !== "interrupted") {
          reject(new Error("Lỗi phát âm thanh mặc định: " + e.error));
        } else {
          resolve();
        }
      };

      activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  } else {
    throw new Error("Trình duyệt của bạn không hỗ trợ công cụ đọc Web Speech API.");
  }
}

export function stopAudio() {
  activeAudio?.pause();
  activeAudio = null;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
}
