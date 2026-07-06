import { supabase } from "@/lib/supabaseClient";
import { courses } from "@/data/courses";

/**
 * Returns the next chronological lesson ID within a given course.
 * E.g., getNextLesson("a1", "a1-1") returns "a1-2".
 */
export function getNextLesson(courseId: string, currentLessonId: string): string | null {
  const parts = currentLessonId.split("-");
  if (parts.length !== 2) return null;
  const num = Number(parts[1]);
  if (isNaN(num)) return null;

  const course = courses.find((c) => c.id === courseId);
  const maxLessons = course ? course.lessons : 10;

  if (num < maxLessons) {
    return `${parts[0]}-${num + 1}`;
  }
  return null;
}

/**
 * Marks a lesson progress record as completed.
 */
export async function markLessonCompleted(userId: string, lessonId: string) {
  const courseId = lessonId.split("-")[0] || "";
  const { error } = await supabase
    .from("user_lesson_progress")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Fallback if schema has it
      },
      { onConflict: "user_id,lesson_id" }
    );

  if (error) throw error;
}

/**
 * Unlocks the next lesson in the course by setting is_unlocked to true.
 */
export async function unlockNextLesson(userId: string, nextLessonId: string) {
  const courseId = nextLessonId.split("-")[0] || "";
  const { error } = await supabase
    .from("user_lesson_progress")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: nextLessonId,
        status: "not_started",
        is_unlocked: true,
      },
      { onConflict: "user_id,lesson_id" }
    );

  if (error) throw error;
}

/**
 * Saves the user's active learning position state.
 */
export async function saveLearningState(options: {
  userId: string;
  courseId: string;
  lessonId: string;
  sentenceIndex: number;
  mode: string;
  route: string;
}) {
  const { userId, courseId, lessonId, sentenceIndex, mode, route } = options;
  const { error } = await supabase
    .from("user_learning_state")
    .upsert(
      {
        user_id: userId,
        current_course_id: courseId,
        current_lesson_id: lessonId,
        current_sentence_index: sentenceIndex,
        last_mode: mode,
        last_route: route,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

/**
 * Resolves the prioritized continuation state for a user.
 */
export async function getContinueLearningState(userId: string) {
  // 1. Fetch active state
  const { data: state, error: stateErr } = await supabase
    .from("user_learning_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (stateErr) throw stateErr;

  if (state) {
    // Check if that specific lesson has been completed
    const { data: progress } = await supabase
      .from("user_lesson_progress")
      .select("status, current_sentence_index, total_sentences")
      .eq("user_id", userId)
      .eq("lesson_id", state.current_lesson_id)
      .maybeSingle();

    if (progress?.status === "completed") {
      const nextId = getNextLesson(state.current_course_id, state.current_lesson_id);
      if (nextId) {
        return {
          courseId: state.current_course_id,
          lessonId: nextId,
          sentenceIndex: 0,
          mode: state.last_mode || "typing",
          status: "next_lesson",
        };
      } else {
        return {
          courseId: state.current_course_id,
          lessonId: state.current_lesson_id,
          sentenceIndex: 0,
          mode: state.last_mode || "typing",
          status: "course_completed",
        };
      }
    }

    return {
      courseId: state.current_course_id,
      lessonId: state.current_lesson_id,
      sentenceIndex: state.current_sentence_index,
      mode: state.last_mode || "typing",
      status: "in_progress",
    };
  }

  // 2. Default fallback if no learning state is found (First lesson of first course)
  return {
    courseId: "a1",
    lessonId: "a1-1",
    sentenceIndex: 0,
    mode: "typing",
    status: "new",
  };
}

/**
 * Resumes learning for a given user.
 */
export async function resumeLearning(userId: string) {
  return getContinueLearningState(userId);
}
