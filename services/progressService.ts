import type { PracticeMode } from "@/types";
import { supabase } from "@/lib/supabaseClient";

export interface PracticeAttemptInput {
  sentenceId: string;
  lessonId: string;
  mode: PracticeMode;
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTimeMs: number;
  nextLessonId?: string;
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
  const result = Array.isArray(data) ? data[0] : data;
  return result as PracticeResult;
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
