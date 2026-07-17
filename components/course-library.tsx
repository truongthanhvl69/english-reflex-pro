"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Clock3, LockKeyhole, Play, Search, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import { courses, lessons, dailyLessons, continuousLessons, structuresLessons } from "@/data/courses";
import { MobileHeader } from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { getUserProgress, type UserProgressData } from "@/services/progressService";

export function CourseLibrary({ onStart, onMenu }: { onStart: (lessonId: string) => void; onMenu: () => void }) {
  const [selectedCourse, setSelectedCourse] = useState("a1");
  const { profile } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgressData[]>([]);
  const selected = courses.find((course) => course.id === selectedCourse) || courses[0];
  
  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "premium";

  useEffect(() => {
    getUserProgress()
      .then((data) => {
        setUserProgress(data);
      })
      .catch((err) => console.error("Error loading user progress:", err));
  }, []);

  const getCourseProgress = (courseId: string) => {
    if (courseId === "a1") {
      const a1Progress = userProgress.filter((p) => p.lesson_id.startsWith("a1-"));
      const completedCount = a1Progress.reduce((sum, item) => sum + (item.completed_sentence_ids?.length || 0), 0);
      return Math.min(100, Math.round((completedCount / 100) * 100));
    }
    if (courseId === "daily") {
      const dailyProgress = userProgress.filter((p) => p.lesson_id.startsWith("daily-"));
      const completedCount = dailyProgress.reduce((sum, item) => sum + (item.completed_sentence_ids?.length || 0), 0);
      return Math.min(100, Math.round((completedCount / 120) * 100));
    }
    if (courseId === "continuous") {
      const continuousProgress = userProgress.filter((p) => p.lesson_id.startsWith("continuous-"));
      const completedCount = continuousProgress.reduce((sum, item) => sum + (item.completed_sentence_ids?.length || 0), 0);
      return Math.min(100, Math.round((completedCount / 50) * 100));
    }
    if (courseId === "structures") {
      const structuresProgress = userProgress.filter((p) => p.lesson_id.startsWith("structures-"));
      const completedCount = structuresProgress.reduce((sum, item) => sum + (item.completed_sentence_ids?.length || 0), 0);
      return Math.min(100, Math.round((completedCount / 2500) * 100));
    }
    return 0;
  };

  return (
    <>
      <MobileHeader onMenu={onMenu} title="Khóa học" />
      <div className="page library-page">
        <header className="page-title-row"><div><span className="eyebrow">THƯ VIỆN HỌC TẬP</span><h1>Chọn lộ trình của bạn</h1><p>Học theo trình độ hoặc tập trung vào tình huống bạn cần nhất.</p></div><div className="header-actions"><div className="search-box"><Search size={18} /><input placeholder="Tìm khóa học..." /></div><button className="icon-button"><SlidersHorizontal size={19} /></button></div></header>

        <div className="filter-tabs">{["Tất cả", "A1", "A2", "B1", "B2", "Giao tiếp", "Công việc"].map((item, index) => <button key={item} className={index === 0 ? "active" : ""}>{item}</button>)}</div>

        <section className="course-layout">
          <div className="course-catalog">
            <div className="course-grid">
              {courses.map((course) => {
                const prog = getCourseProgress(course.id);
                return (
                  <button key={course.id} className={`catalog-card ${course.color} ${selectedCourse === course.id ? "selected" : ""}`} onClick={() => setSelectedCourse(course.id)}>
                    <div className="catalog-top"><span className="catalog-icon">{course.icon}</span><span className="course-level">{course.level}</span></div>
                    <h3>{course.title}</h3><p>{course.description}</p>
                    <div className="tag-row">{course.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <div className="catalog-meta"><span>{course.lessons} bài</span><i /> <span>{course.sentences} câu</span></div>
                    {prog > 0 && <div className="catalog-progress"><div><i style={{ width: `${prog}%` }} /></div><b>{prog}%</b></div>}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="lesson-panel">
            <div className={`lesson-cover ${selected.color}`}><div><span>{selected.icon}</span><i>{selected.level}</i></div><h2>{selected.title}</h2><p>{selected.description}</p><div><span><Clock3 size={14} /> ~8 phút/bài</span><span><Star size={14} /> +{selected.lessons * 100} EXP</span></div></div>
            <div className="lesson-panel-heading"><div><h3>Danh sách bài học</h3><p>{selected.lessons} bài · {selected.sentences} câu</p></div><button><ChevronDown size={18} /></button></div>
            <div className="lesson-list">
              {selected.id === "a1" ? (
                lessons.map((lesson) => {
                  const dbProgress = userProgress.find((p) => p.lesson_id === lesson.id);
                  const isCompleted = dbProgress ? (dbProgress.is_completed || (dbProgress.completed_sentence_ids?.length || 0) >= 10) : false;
                  const progressPercent = dbProgress ? Math.min(100, (dbProgress.completed_sentence_ids?.length || 0) * 10) : 0;
                  const lessonLocked = isPro ? false : (dbProgress ? !dbProgress.is_unlocked : lesson.locked);

                  return (
                    <button key={lesson.id} disabled={lessonLocked} onClick={() => onStart(lesson.id)} className={progressPercent > 0 && !isCompleted ? "current" : ""}>
                      <span className={`lesson-status ${isCompleted ? "done" : lessonLocked ? "locked" : "ready"}`}>
                        {isCompleted ? <Check size={16} /> : lessonLocked ? <LockKeyhole size={14} /> : <Play size={14} fill="currentColor" />}
                      </span>
                      <div>
                        <strong>{lesson.title}: {lesson.subtitle}</strong>
                        <span>{progressPercent > 0 ? `${progressPercent}% hoàn thành` : `10 câu · +${lesson.exp} EXP`}</span>
                      </div>
                      {progressPercent > 0 && <div className="lesson-mini-progress"><i style={{ width: `${progressPercent}%` }} /></div>}
                    </button>
                  );
                })
              ) : selected.id === "daily" ? (
                dailyLessons.map((lesson) => {
                  const dbProgress = userProgress.find((p) => p.lesson_id === lesson.id);
                  const isCompleted = dbProgress ? (dbProgress.is_completed || (dbProgress.completed_sentence_ids?.length || 0) >= 10) : false;
                  const progressPercent = dbProgress ? Math.min(100, (dbProgress.completed_sentence_ids?.length || 0) * 10) : 0;
                  const lessonLocked = isPro ? false : (dbProgress ? !dbProgress.is_unlocked : lesson.locked);

                  return (
                    <button key={lesson.id} disabled={lessonLocked} onClick={() => onStart(lesson.id)} className={progressPercent > 0 && !isCompleted ? "current" : ""}>
                      <span className={`lesson-status ${isCompleted ? "done" : lessonLocked ? "locked" : "ready"}`}>
                        {isCompleted ? <Check size={16} /> : lessonLocked ? <LockKeyhole size={14} /> : <Play size={14} fill="currentColor" />}
                      </span>
                      <div>
                        <strong>{lesson.title}: {lesson.subtitle}</strong>
                        <span>{progressPercent > 0 ? `${progressPercent}% hoàn thành` : `10 câu · +${lesson.exp} EXP`}</span>
                      </div>
                      {progressPercent > 0 && <div className="lesson-mini-progress"><i style={{ width: `${progressPercent}%` }} /></div>}
                    </button>
                  );
                })
              ) : selected.id === "continuous" ? (
                continuousLessons.map((lesson) => {
                  const dbProgress = userProgress.find((p) => p.lesson_id === lesson.id);
                  const isCompleted = dbProgress ? (dbProgress.is_completed || (dbProgress.completed_sentence_ids?.length || 0) >= 10) : false;
                  const progressPercent = dbProgress ? Math.min(100, (dbProgress.completed_sentence_ids?.length || 0) * 10) : 0;
                  const lessonLocked = isPro ? false : (dbProgress ? !dbProgress.is_unlocked : lesson.locked);

                  return (
                    <button key={lesson.id} disabled={lessonLocked} onClick={() => onStart(lesson.id)} className={progressPercent > 0 && !isCompleted ? "current" : ""}>
                      <span className={`lesson-status ${isCompleted ? "done" : lessonLocked ? "locked" : "ready"}`}>
                        {isCompleted ? <Check size={16} /> : lessonLocked ? <LockKeyhole size={14} /> : <Play size={14} fill="currentColor" />}
                      </span>
                      <div>
                        <strong>{lesson.title}: {lesson.subtitle}</strong>
                        <span>{progressPercent > 0 ? `${progressPercent}% hoàn thành` : `10 câu · +${lesson.exp} EXP`}</span>
                      </div>
                      {progressPercent > 0 && <div className="lesson-mini-progress"><i style={{ width: `${progressPercent}%` }} /></div>}
                    </button>
                  );
                })
              ) : selected.id === "structures" ? (
                structuresLessons.map((lesson) => {
                  const dbProgress = userProgress.find((p) => p.lesson_id === lesson.id);
                  const totalSentences = 50;
                  const isCompleted = dbProgress ? (dbProgress.is_completed || (dbProgress.completed_sentence_ids?.length || 0) >= totalSentences) : false;
                  const progressPercent = dbProgress ? Math.min(100, Math.round(((dbProgress.completed_sentence_ids?.length || 0) / totalSentences) * 100)) : 0;
                  const lessonLocked = lesson.id !== "structures-1" ? true : (isPro ? false : (dbProgress ? !dbProgress.is_unlocked : lesson.locked));

                  return (
                    <button key={lesson.id} disabled={lessonLocked} onClick={() => onStart(lesson.id)} className={progressPercent > 0 && !isCompleted ? "current" : ""}>
                      <span className={`lesson-status ${isCompleted ? "done" : lessonLocked ? "locked" : "ready"}`}>
                        {isCompleted ? <Check size={16} /> : lessonLocked ? <LockKeyhole size={14} /> : <Play size={14} fill="currentColor" />}
                      </span>
                      <div>
                        <strong>{lesson.title}: {lesson.subtitle}</strong>
                        <span>
                          {lesson.id === "structures-1"
                            ? (progressPercent > 0 ? `${progressPercent}% hoàn thành` : `50 câu · +${lesson.exp} EXP`)
                            : "Sắp ra mắt / Cập nhật sau"}
                        </span>
                      </div>
                      {progressPercent > 0 && <div className="lesson-mini-progress"><i style={{ width: `${progressPercent}%` }} /></div>}
                    </button>
                  );
                })
              ) : (
                <div className="empty-lessons">
                  <Sparkles size={28} />
                  <h3>Lộ trình đang được tinh chỉnh</h3>
                  <p>Chọn Nền tảng A1 hoặc Giao tiếp hằng ngày để trải nghiệm các bài học mẫu.</p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </>
  );
}
