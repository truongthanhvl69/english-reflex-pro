export type VoiceName = "Kore" | "Charon";

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export async function playSentence(text: string, voice: VoiceName, speed = 1) {
  // Stop any active audio and speech synthesis
  activeAudio?.pause();
  activeAudio = null;
  
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });

    if (response.ok) {
      const { audioUrl } = (await response.json()) as { audioUrl: string };
      activeAudio = new Audio(audioUrl);
      activeAudio.playbackRate = speed;
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
      utterance.lang = "en-US";
      utterance.rate = speed;

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      if (voice === "Charon") {
        // Try to find a male English voice
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            v.name.toLowerCase().includes("male") &&
            !v.name.toLowerCase().includes("female")
        );
      } else {
        // Try to find a female English voice
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("zira") ||
              v.name.toLowerCase().includes("google us english"))
        );
      }

      // Default fallback english voice
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

