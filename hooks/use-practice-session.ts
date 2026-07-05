"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sentences } from "@/data/sentences";
import type { Feedback, PracticeMode } from "@/types";
import { isAcceptedAnswer, shuffle } from "@/utils/answer";
import { useAnswerAudioFeedback } from "@/hooks/useAnswerAudioFeedback";
import { useAuth } from "@/hooks/useAuth";
import { useMembership } from "@/hooks/useMembership";
import { recordPracticeAttempt, setSentenceMarkedHard } from "@/services/progressService";

function cleanLessonId(rawLesson: string, currentLessonId?: string | null): string {
  if (currentLessonId) return currentLessonId;
  const match = rawLesson.match(/^([^-]+)\s*-\s*Bài\s*(\d+)/i);
  if (match) {
    const courseCode = match[1].trim().toLowerCase();
    const num = Number(match[2]);
    return `${courseCode}-${num}`;
  }
  return rawLesson;
}

function getNextLessonId(currentId?: string | null): string | null {
  if (!currentId) return null;
  const parts = currentId.split("-");
  if (parts.length !== 2) return null;
  const courseCode = parts[0];
  const num = Number(parts[1]);
  if (isNaN(num)) return null;

  let maxLessons = 10;
  if (courseCode === "daily") maxLessons = 12;
  else if (courseCode === "office") maxLessons = 14;
  else if (courseCode === "phrases") maxLessons = 50;
  else if (courseCode === "collocations") maxLessons = 18;

  if (num < maxLessons) {
    return `${courseCode}-${num + 1}`;
  }
  return null;
}

export function usePracticeSession(initialMode: PracticeMode, lessonId?: string | null) {
  const { profile, refreshProfile, showToast } = useAuth();
  const { plan, isLimitReached, checkFeatureAccess, triggerLimitModal } = useMembership();
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

  const filteredSentences = useMemo(() => {
    if (!lessonId) return sentences;
    const [courseId, lessonNum] = lessonId.split("-");
    if (courseId && lessonNum) {
      const targetLesson = `${courseId.toUpperCase()} - Bài ${lessonNum.padStart(2, "0")}`;
      const matched = sentences.filter((s) => s.lesson === targetLesson);
      if (matched.length > 0) return matched;
    }
    return sentences;
  }, [lessonId]);

  const sentence = filteredSentences[index % filteredSentences.length];

  const lessonLabel = useMemo(() => {
    if (!lessonId) return "Luyện tập tổng hợp";
    const [courseId, lessonNum] = lessonId.split("-");
    const num = Number(lessonNum);
    if (courseId === "a1" && num >= 1 && num <= 10) {
      const subtitles = ["Chào hỏi & giới thiệu", "Gia đình & bạn bè", "Thói quen mỗi ngày", "Ăn uống", "Mua sắm", "Thời gian", "Công việc", "Di chuyển", "Sở thích", "Ôn tập phản xạ"];
      return `A1 · Bài ${String(num).padStart(2, "0")}: ${subtitles[num - 1]}`;
    }
    return `Bài học ${lessonId.toUpperCase()}`;
  }, [lessonId]);

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
    setIndex(0);
    resetQuestion();
  }, [lessonId, resetQuestion]);

  useEffect(() => {
    setExp(profile?.exp ?? 0);
  }, [profile?.exp]);

  useEffect(() => {
    questionStartedAt.current = performance.now();
  }, [index, mode]);

  const changeMode = useCallback((nextMode: PracticeMode) => {
    if (nextMode === "speaking") {
      const hasAccess = checkFeatureAccess("speaking");
      if (!hasAccess) return;
    }
    setMode(nextMode);
    resetQuestion();
  }, [resetQuestion, checkFeatureAccess]);

  const submit = useCallback(async () => {
    if (isLimitReached) {
      triggerLimitModal();
      return;
    }

    const submitted = mode === "word-bank" ? selectedWords.map((item) => item.word).join(" ") : answer;
    const expected = mode === "reverse" ? sentence.vietnamese : sentence.english;
    const alternatives = mode === "reverse" ? [] : sentence.alternativeAnswers;
    const correct = isAcceptedAnswer(submitted, [expected, ...alternatives]);
    
    const cleanId = cleanLessonId(sentence.lesson, lessonId);
    const nextLessonId = getNextLessonId(cleanId);
    const responseTimeMs = performance.now() - questionStartedAt.current;

    void recordPracticeAttempt({
      sentenceId: sentence.id,
      lessonId: cleanId,
      mode,
      submittedAnswer: submitted,
      correctAnswer: expected,
      isCorrect: correct,
      responseTimeMs,
      nextLessonId: nextLessonId || undefined,
    }).then((result) => {
      setExp(result.exp);
      void refreshProfile();
      // Record answer count locally on the client for instant limit reaction
      window.dispatchEvent(new Event("sentence_answer_recorded"));
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

    const isPro = plan === "pro" || plan === "premium";
    if (isPro) {
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
    } else {
      setFeedback((current) => current ? {
        ...current,
        explanation: "💡 Hãy nâng cấp tài khoản PRO để nhận phân tích chi tiết lỗi sai và gợi ý sửa ngữ pháp từ AI trợ lý học tập."
      } : current);
    }
  }, [answer, combo, mode, playFeedback, refreshProfile, selectedWords, sentence, showToast, isLimitReached, triggerLimitModal, plan]);

  const completeSpeaking = useCallback(() => {
    if (isLimitReached) {
      triggerLimitModal();
      return;
    }

    const cleanId = cleanLessonId(sentence.lesson, lessonId);
    const nextLessonId = getNextLessonId(cleanId);

    void recordPracticeAttempt({
      sentenceId: sentence.id,
      lessonId: cleanId,
      mode: "speaking",
      submittedAnswer: sentence.english,
      correctAnswer: sentence.english,
      isCorrect: true,
      responseTimeMs: performance.now() - questionStartedAt.current,
      nextLessonId: nextLessonId || undefined,
    }).then((result) => {
      setExp(result.exp);
      void refreshProfile();
      window.dispatchEvent(new Event("sentence_answer_recorded"));
    }).catch(() => {
      showToast("Chưa thể đồng bộ lượt luyện nói này.", "error");
    });
  }, [refreshProfile, sentence, showToast, isLimitReached, triggerLimitModal]);

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
    setIndex((value) => (value + 1) % filteredSentences.length);
    resetQuestion();
  }, [resetQuestion, filteredSentences.length]);

  const previous = useCallback(() => {
    setIndex((value) => (value - 1 + filteredSentences.length) % filteredSentences.length);
    resetQuestion();
  }, [resetQuestion, filteredSentences.length]);

  return {
    mode, changeMode, index, sentence, answer, setAnswer, selectedWords, setSelectedWords,
    shuffledWords, feedback, setFeedback, exp, combo, correctCount, submit, next, previous,
    markedHard, toggleMarkedHard, completeSpeaking,
    lessonLabel,
    totalQuestions: filteredSentences.length,
    progress: ((index + 1) / filteredSentences.length) * 100,
  };
}
