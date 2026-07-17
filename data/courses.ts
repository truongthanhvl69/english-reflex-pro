import type { Course } from "@/types";

export const courses: Course[] = [
  { id: "a1", title: "Nền tảng A1", description: "Câu thiết yếu cho người mới bắt đầu", level: "A1", icon: "🌱", color: "mint", lessons: 10, sentences: 100, progress: 0, tags: ["Phổ biến", "Nền tảng"] },
  { id: "daily", title: "Giao tiếp hằng ngày", description: "Nói tự nhiên trong những tình huống quen thuộc", level: "A1–A2", icon: "💬", color: "blue", lessons: 12, sentences: 120, progress: 0, tags: ["Thực tế"] },
  { id: "continuous", title: "Present Continuous", description: "Luyện phản xạ thì hiện tại tiếp diễn qua các tình huống thực tế", level: "A1–A2", icon: "🔄", color: "pink", lessons: 5, sentences: 50, progress: 0, tags: ["Ngữ pháp", "Thì"] },
  { id: "office", title: "Tiếng Anh công sở", description: "Họp, email và trao đổi với đồng nghiệp", level: "A2–B1", icon: "💼", color: "violet", lessons: 14, sentences: 140, progress: 0, tags: ["Công việc"] },
  { id: "travel", title: "Tiếng Anh du lịch", description: "Tự tin từ sân bay đến khách sạn", level: "A1–A2", icon: "✈️", color: "orange", lessons: 10, sentences: 100, progress: 0, tags: ["Tình huống"] },
  { id: "phrases", title: "1000 câu thông dụng", description: "Kho phản xạ dùng được ngay trong đời sống", level: "A1–B2", icon: "⚡", color: "yellow", lessons: 50, sentences: 1000, progress: 0, tags: ["Thử thách"] },
  { id: "collocations", title: "Collocations", description: "Ghép từ đúng kiểu người bản xứ", level: "B1–C1", icon: "🧩", color: "pink", lessons: 18, sentences: 180, progress: 0, tags: ["Nâng cao"] },
  { id: "structures", title: "50 Cấu Trúc Câu Thông Dụng", description: "Luyện phản xạ các cấu trúc câu giao tiếp và ngữ pháp then chốt", level: "A2–B2", icon: "💎", color: "violet", lessons: 50, sentences: 2500, progress: 0, tags: ["Cấu trúc", "Ngữ pháp"] },
];

export const lessons = Array.from({ length: 10 }, (_, index) => ({
  id: `a1-${index + 1}`,
  title: `Bài ${String(index + 1).padStart(2, "0")}`,
  subtitle: ["Chào hỏi & giới thiệu", "Gia đình & bạn bè", "Thói quen mỗi ngày", "Ăn uống", "Mua sắm", "Thời gian", "Công việc", "Di chuyển", "Sở thích", "Ôn tập phản xạ"][index],
  completed: false,
  locked: index > 3,
  progress: 0,
  exp: 80 + index * 10,
}));

export const dailyLessons = Array.from({ length: 12 }, (_, index) => ({
  id: `daily-${index + 1}`,
  title: `Bài ${String(index + 1).padStart(2, "0")}`,
  subtitle: [
    "Chào hỏi xã giao",
    "Giới thiệu bản thân",
    "Giao tiếp cơ bản",
    "Liên lạc & Lịch sự",
    "Lời mời & Thời gian",
    "Cảm xúc & Ý kiến",
    "Ý kiến & Đồng thuận",
    "Mua sắm & Hỏi đường",
    "Di chuyển & Hành động",
    "Sở thích & Ưa chuộng",
    "Hoạt động & Thời gian",
    "Lời chúc & Động viên"
  ][index] || "Giao tiếp tự nhiên",
  completed: false,
  locked: index > 0,
  progress: 0,
  exp: 100,
}));

export const continuousLessons = Array.from({ length: 5 }, (_, index) => ({
  id: `continuous-${index + 1}`,
  title: `Bài ${String(index + 1).padStart(2, "0")}`,
  subtitle: [
    "Hành động tại chỗ",
    "Hoạt động xung quanh",
    "Tình huống thực tế",
    "Kế hoạch & Dự định",
    "Sự thay đổi & Xu hướng"
  ][index] || "Hiện tại tiếp diễn",
  completed: false,
  locked: index > 0,
  progress: 0,
  exp: 100,
}));

export const structuresLessons = Array.from({ length: 50 }, (_, index) => ({
  id: `structures-${index + 1}`,
  title: `Bài ${String(index + 1).padStart(2, "0")}`,
  subtitle: index === 0 ? "Cấu trúc Too... to (Quá... để làm gì)" : "Cập nhật sau",
  completed: false,
  locked: index > 0,
  progress: 0,
  exp: 100,
}));
