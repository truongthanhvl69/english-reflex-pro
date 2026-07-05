import type { Course } from "@/types";

export const courses: Course[] = [
  { id: "a1", title: "Nền tảng A1", description: "Câu thiết yếu cho người mới bắt đầu", level: "A1", icon: "🌱", color: "mint", lessons: 10, sentences: 100, progress: 68, tags: ["Phổ biến", "Nền tảng"] },
  { id: "daily", title: "Giao tiếp hằng ngày", description: "Nói tự nhiên trong những tình huống quen thuộc", level: "A1–A2", icon: "💬", color: "blue", lessons: 12, sentences: 120, progress: 24, tags: ["Thực tế"] },
  { id: "office", title: "Tiếng Anh công sở", description: "Họp, email và trao đổi với đồng nghiệp", level: "A2–B1", icon: "💼", color: "violet", lessons: 14, sentences: 140, progress: 0, tags: ["Công việc"] },
  { id: "travel", title: "Tiếng Anh du lịch", description: "Tự tin từ sân bay đến khách sạn", level: "A1–A2", icon: "✈️", color: "orange", lessons: 10, sentences: 100, progress: 0, tags: ["Tình huống"] },
  { id: "phrases", title: "1000 câu thông dụng", description: "Kho phản xạ dùng được ngay trong đời sống", level: "A1–B2", icon: "⚡", color: "yellow", lessons: 50, sentences: 1000, progress: 4, tags: ["Thử thách"] },
  { id: "collocations", title: "Collocations", description: "Ghép từ đúng kiểu người bản xứ", level: "B1–C1", icon: "🧩", color: "pink", lessons: 18, sentences: 180, progress: 0, tags: ["Nâng cao"] },
];

export const lessons = Array.from({ length: 10 }, (_, index) => ({
  id: `a1-${index + 1}`,
  title: `Bài ${String(index + 1).padStart(2, "0")}`,
  subtitle: ["Chào hỏi & giới thiệu", "Gia đình & bạn bè", "Thói quen mỗi ngày", "Ăn uống", "Mua sắm", "Thời gian", "Công việc", "Di chuyển", "Sở thích", "Ôn tập phản xạ"][index],
  completed: index < 3,
  locked: index > 3,
  progress: index < 3 ? 100 : index === 3 ? 35 : 0,
  exp: 80 + index * 10,
}));
