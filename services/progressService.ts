import type { PracticeMode } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { getNextLesson, unlockNextLesson } from "./learningStateService";
import { sentences } from "@/data/sentences";

export interface PracticeAttemptInput {
  sentenceId: string;
  lessonId: string;
  mode: PracticeMode;
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTimeMs: number;
  nextLessonId?: string;
  sentenceIndex?: number; // Tracks index of the active sentence
}

export interface PracticeResult {
  exp: number;
  streak: number;
  accuracy: number;
  lesson_accuracy: number;
}

export interface SentenceHistory {
  id: number;
  sentence_id: string;
  lesson_id: string;
  mode: PracticeMode;
  submitted_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  response_time_ms: number | null;
  marked_hard: boolean;
  created_at: string;
}

export async function recordPracticeAttempt(input: PracticeAttemptInput): Promise<PracticeResult> {
  // 1. Call existing DB function (streak logic, stats update in user_progress etc.)
  const { data, error } = await supabase.rpc("record_practice_answer", {
    p_sentence_id: input.sentenceId,
    p_lesson_id: input.lessonId,
    p_mode: input.mode,
    p_submitted_answer: input.submittedAnswer,
    p_correct_answer: input.correctAnswer,
    p_is_correct: input.isCorrect,
    p_response_time_ms: Math.max(0, Math.round(input.responseTimeMs)),
    p_next_lesson_id: input.nextLessonId ?? null,
  });

  if (error) throw error;
  const result = (Array.isArray(data) ? data[0] : data) as PracticeResult;

  // 2. Fetch authenticated user to write custom progress states
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return result;

  const userId = user.id;
  const courseId = input.lessonId.split("-")[0] || "";
  const lessonId = input.lessonId;

  // Load existing user_lesson_progress
  const { data: progress } = await supabase
    .from("user_lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const isCorrectNum = input.isCorrect ? 1 : 0;
  const isWrongNum = input.isCorrect ? 0 : 1;
  const expGain = input.isCorrect ? 10 : 0; // Standard 10 EXP per correct answer

  let correctCount = isCorrectNum;
  let wrongCount = isWrongNum;
  let expEarned = expGain;
  let status = "in_progress";
  let completedAt = null;

  if (progress) {
    correctCount = (progress.correct_count || 0) + isCorrectNum;
    wrongCount = (progress.wrong_count || 0) + isWrongNum;
    expEarned = (progress.exp_earned || 0) + expGain;
    status = progress.status;
    completedAt = progress.completed_at;
  }

  const totalAnswers = correctCount + wrongCount;
  const accuracy = totalAnswers > 0 ? Number(((correctCount / totalAnswers) * 100).toFixed(2)) : 0;

  const sentenceIndex = input.sentenceIndex ?? 0;
  let nextIndex = sentenceIndex + 1;

  const [courseCode, lessonNum] = input.lessonId.split("-");
  let totalSentencesInLesson = 10;
  if (courseCode && lessonNum) {
    const targetLesson = `${courseCode.toUpperCase()} - Bài ${lessonNum.padStart(2, "0")}`;
    const matched = sentences.filter((s) => s.lesson === targetLesson);
    if (matched.length > 0) {
      totalSentencesInLesson = matched.length;
    }
  }

  // Since lessons contain variable amount of questions (e.g. 10 or 50), when index hits total it is completed
  const isLessonComplete = nextIndex >= totalSentencesInLesson;
  if (isLessonComplete) {
    status = "completed";
    completedAt = new Date().toISOString();
    nextIndex = 0; // Loop or set index back to start
  }

  // Update user_lesson_progress table
  const { error: progErr } = await supabase
    .from("user_lesson_progress")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        status,
        current_sentence_index: nextIndex,
        total_sentences: totalSentencesInLesson,
        correct_count: correctCount,
        wrong_count: wrongCount,
        accuracy,
        exp_earned: expEarned,
        is_unlocked: true,
        last_accessed_at: new Date().toISOString(),
        completed_at: completedAt,
      },
      { onConflict: "user_id,lesson_id" }
    );

  if (progErr) {
    console.error("Error writing user_lesson_progress:", progErr);
  }

  // Update user_learning_state table
  let activeCourseId = courseId;
  let activeLessonId = lessonId;
  let activeIndex = nextIndex;

  if (isLessonComplete) {
    // Automatically find and unlock next lesson
    const nextLessonId = getNextLesson(courseId, lessonId);
    if (nextLessonId) {
      await unlockNextLesson(userId, nextLessonId);
      activeLessonId = nextLessonId;
      activeIndex = 0;
    }
  }

  const { error: stateErr } = await supabase
    .from("user_learning_state")
    .upsert(
      {
        user_id: userId,
        current_course_id: activeCourseId,
        current_lesson_id: activeLessonId,
        current_sentence_index: activeIndex,
        last_mode: input.mode,
        last_route: "practice",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (stateErr) {
    console.error("Error writing user_learning_state:", stateErr);
  }

  return result;
}

export async function setSentenceMarkedHard(sentenceId: string, markedHard: boolean) {
  const { error } = await supabase.rpc("set_sentence_marked_hard", {
    p_sentence_id: sentenceId,
    p_marked_hard: markedHard,
  });
  if (error) throw error;
}

export async function getSentenceHistory(limit = 500): Promise<SentenceHistory[]> {
  const { data, error } = await supabase
    .from("user_sentence_history")
    .select("id, sentence_id, lesson_id, mode, submitted_answer, correct_answer, is_correct, response_time_ms, marked_hard, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SentenceHistory[];
}

export interface UserProgressData {
  lesson_id: string;
  is_completed: boolean;
  completed_sentence_ids: string[];
  total_answers: number;
  correct_answers: number;
  accuracy: number;
  is_unlocked: boolean;
}

export async function getUserProgress(): Promise<UserProgressData[]> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("lesson_id, is_completed, completed_sentence_ids, total_answers, correct_answers, accuracy, is_unlocked");

  if (error) throw error;
  return (data ?? []) as UserProgressData[];
}
