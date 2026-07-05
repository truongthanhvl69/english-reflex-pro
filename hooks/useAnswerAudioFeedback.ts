import { playAnswerFeedback, stopAllAudio } from "@/services/audioManager";

export function useAnswerAudioFeedback() {
  const playFeedback = async (isCorrect: boolean, sentenceId: string, correctText: string) => {
    try {
      await playAnswerFeedback({
        isCorrect,
        sentenceId,
        correctText,
      });
    } catch (error) {
      console.error("Lỗi phát âm thanh phản hồi:", error);
    }
  };

  return {
    playFeedback,
    stopAllAudio,
  };
}
