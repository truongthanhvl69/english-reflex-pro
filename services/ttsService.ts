export type VoiceType = "male" | "female" | "us" | "uk";

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

if (typeof window !== "undefined") {
  activeAudio = new Audio();
}

/**
 * Synchronously unlocks the audio system in response to a user click/tap gesture.
 * This resolves mobile browser (iOS Safari, Android Chrome) block policies.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!activeAudio) {
    activeAudio = new Audio();
  }
  try {
    // Play a silent 1-second audio block to activate the audio element channel
    activeAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    activeAudio.play().catch(() => {});
  } catch (e) {
    // Ignore error since it's just a placeholder sound
  }

  // Also pre-unlock Web Speech Synthesis channel
  try {
    if (window.speechSynthesis) {
      const silentUtterance = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(silentUtterance);
    }
  } catch (e) {
    // Ignore error
  }
}

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
  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch (e) {}
  } else if (typeof window !== "undefined") {
    activeAudio = new Audio();
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
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

  let apiPlayed = false;

  try {
    // Add safety timeout (AbortController) to network request so it doesn't freeze the UI on slow networks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, accent }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const { audioUrl } = (await response.json()) as { audioUrl: string };
      if (activeAudio) {
        activeAudio.src = audioUrl;
        activeAudio.playbackRate = speedRate;
        activeAudio.volume = voiceVolume;
        await activeAudio.play();
        apiPlayed = true;
        return activeAudio;
      }
    }

    const payload = await response.json().catch(() => ({}));
    console.warn("Không sử dụng được Gemini TTS, chuyển sang Web Speech API:", payload.error);
  } catch (error) {
    console.warn("Lỗi gọi API tts hoặc phát audio, chuyển sang Web Speech API:", error);
  }

  if (apiPlayed) return;

  // Fallback to Web Speech API (Browser default voice)
  if (typeof window !== "undefined" && window.speechSynthesis) {
    return new Promise<void>((resolve, reject) => {
      // 5-second maximum safety timeout to guarantee the loading spinner will clear
      const speechTimeout = setTimeout(() => {
        console.warn("Web Speech API timeout reached, clearing loading spinner.");
        resolve();
      }, 5000);

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
        clearTimeout(speechTimeout);
        activeUtterance = null;
        resolve();
      };

      utterance.onerror = (e) => {
        clearTimeout(speechTimeout);
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
  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch (e) {}
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  activeUtterance = null;
}
