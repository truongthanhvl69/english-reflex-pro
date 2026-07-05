export type PracticeMode = "typing" | "word-bank" | "listening" | "reverse" | "speaking";
export type AppView = "home" | "practice" | "courses" | "progress" | "leaderboard" | "settings";

export interface Sentence {
  id: string;
  english: string;
  vietnamese: string;
  ipa: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  category: string;
  lesson: string;
  partOfSpeech: string;
  grammarNote: string;
  alternativeAnswers: string[];
  wordBank: string[];
  audioUrl: string;
  tags: string[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  icon: string;
  color: string;
  lessons: number;
  sentences: number;
  progress: number;
  tags: string[];
}

export interface Feedback {
  correct: boolean;
  title: string;
  message: string;
  correctAnswer: string;
  explanation?: string;
  memoryTip?: string;
  example?: string;
}
