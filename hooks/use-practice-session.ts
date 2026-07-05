"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sentences } from "@/data/sentences";
import type { Feedback, PracticeMode } from "@/types";
import { isAcceptedAnswer, shuffle } from "@/utils/answer";
import { useAnswerAudioFeedback } from "@/hooks/useAnswerAudioFeedback";
import { useAuth } from "@/hooks/useAuth";
import { recordPracticeAttempt, setSentenceMarkedHard } from "@/services/progressService";

export function usePracticeSession(initialMode: PracticeMode) {
  const { profile, refreshProfile, showToast } = useAuth();
  const [mode, setMode] = useState<PracticeMode>(initialMode);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedWords, setSelectedWords] = useState<{ id: number; word: string }[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [exp, setExp] = useState(profile?.exp ?? 0);
  const [combo, setCombo] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [markedHard, setMarkedHard] = useState(false);
  const questionStartedAt = useRef(0);

  const { playFeedback } = useAnswerAudioFeedback();

  const sentence = sentences[index % sentences.length];
  const shuffledWords = useMemo(
    () => shuffle(sentence.wordBank.map((word, wordIndex) => ({ id: wordIndex, word }))),
    [sentence],
  );

  const resetQuestion = useCallback(() => {
    setAnswer("");
    setSelectedWords([]);
    setFeedback(null);
    setMarkedHard(false);
    questionStartedAt.current = performance.now();
  }, []);

  useEffect(() => {
    setExp(profile?.exp ?? 0);
  }, [profile?.exp]);

  useEffect(() => {
    questionStartedAt.current = performance.now();
  }, [index, mode]);

  const changeMode = useCallback((nextMode: PracticeMode) => {
    setMode(nextMode);
    resetQuestion();
  }, [resetQuestion]);

  const submit = useCallback(async () => {
    const submitted = mode === "word-bank" ? selectedWords.map((item) => item.word).join(" ") : answer;
    const expected = mode === "reverse" ? sentence.vietnamese : sentence.english;
    const alternatives = mode === "reverse" ? [] : sentence.alternativeAnswers;
    const correct = isAcceptedAnswer(submitted, [expected, ...alternatives]);
    const lessonNumber = Number(sentence.lesson.match(/(\d+)$/)?.[1] ?? 1);
    const nextLessonId = sentence.lesson.replace(/\d+$/, String(lessonNumber + 1).padStart(2, "0"));
    const responseTimeMs = performance.now() - questionStartedAt.current;

    void recordPracticeAttempt({
      sentenceId: sentence.id,
      lessonId: sentence.lesson,
      mode,
      submittedAnswer: submitted,
      correctAnswer: expected,
      isCorrect: correct,
      responseTimeMs,
      nextLessonId,
    }).then((result) => {
      setExp(result.exp);
      void refreshProfile();
    }).catch(() => {
      showToast("Kết quả đã chấm nhưng chưa thể đồng bộ. Vui lòng kiểm tra kết nối.", "error");
    });

    // Trigger audio feedback right away (correct chime or wrong buzzer + correct sentence TTS)
    void playFeedback(correct, sentence.id, sentence.english);

    if (correct) {
      setCorrectCount((value) => value + 1);
      setCombo((value) => value + 1);
      setExp((value) => value + 10);
      setFeedback({
        correct: true,
        title: combo >= 4 ? "Quá mượt! Combo đang cháy 🔥" : "Chính xác!",
        message: "Câu trả lời tự nhiên và đúng ngữ cảnh.",
        correctAnswer: expected,
        memoryTip: sentence.grammarNote,
      });
      return;
    }


    setCombo(0);
    setFeedback({
      correct: false,
      title: "Gần đúng rồi — sửa một chút nhé",
      message: "Hãy so sánh trật tự từ và dạng của động từ.",
      correctAnswer: expected,
      explanation: sentence.grammarNote,
      memoryTip: `Đọc thành cụm: “${sentence.english}”, đừng dịch từng từ.`,
      example: sentence.alternativeAnswers[0] || "Hãy nói lại cả câu với nhịp đều.",
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submitted, sentence }),
      });
      if (response.ok) {
        const aiFeedback = await response.json();
        setFeedback((current) => current ? { ...current, ...aiFeedback, correct: false, correctAnswer: expected } : current);
      }
    } catch {
      // Local feedback is intentionally kept when AI is unavailable.
    }
  }, [answer, combo, mode, playFeedback, refreshProfile, selectedWords, sentence, showToast]);

  const completeSpeaking = useCallback(() => {
    void recordPracticeAttempt({
      sentenceId: sentence.id,
      lessonId: sentence.lesson,
      mode: "speaking",
      submittedAnswer: sentence.english,
      correctAnswer: sentence.english,
      isCorrect: true,
      responseTimeMs: performance.now() - questionStartedAt.current,
    }).then((result) => {
      setExp(result.exp);
      void refreshProfile();
    }).catch(() => {
      showToast("Chưa thể đồng bộ lượt luyện nói này.", "error");
    });
  }, [refreshProfile, sentence, showToast]);

  const toggleMarkedHard = useCallback(async () => {
    const nextValue = !markedHard;
    setMarkedHard(nextValue);
    try {
      await setSentenceMarkedHard(sentence.id, nextValue);
      showToast(nextValue ? "Đã thêm vào danh sách câu khó." : "Đã bỏ đánh dấu câu khó.", "success");
    } catch {
      setMarkedHard(!nextValue);
      showToast("Chưa thể cập nhật câu khó.", "error");
    }
  }, [markedHard, sentence.id, showToast]);

  const next = useCallback(() => {
    setIndex((value) => (value + 1) % sentences.length);
    resetQuestion();
  }, [resetQuestion]);

  const previous = useCallback(() => {
    setIndex((value) => (value - 1 + sentences.length) % sentences.length);
    resetQuestion();
  }, [resetQuestion]);

  return {
    mode, changeMode, index, sentence, answer, setAnswer, selectedWords, setSelectedWords,
    shuffledWords, feedback, setFeedback, exp, combo, correctCount, submit, next, previous,
    markedHard, toggleMarkedHard, completeSpeaking,
    progress: ((index + 1) / 10) * 100,
  };
}
