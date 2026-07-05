"use client";

import { useState } from "react";
import { Check, ChevronDown, Clock3, LockKeyhole, Play, Search, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import { courses, lessons, dailyLessons } from "@/data/courses";
import { MobileHeader } from "@/components/sidebar";

export function CourseLibrary({ onStart, onMenu }: { onStart: (lessonId: string) => void; onMenu: () => void }) {
  const [selectedCourse, setSelectedCourse] = useState("a1");
  const selected = courses.find((course) => course.id === selectedCourse) || courses[0];

  return (
    <>
      <MobileHeader onMenu={onMenu} title="Khóa học" />
      <div className="page library-page">
        <header className="page-title-row"><div><span className="eyebrow">THƯ VIỆN HỌC TẬP</span><h1>Chọn lộ trình của bạn</h1><p>Học theo trình độ hoặc tập trung vào tình huống bạn cần nhất.</p></div><div className="header-actions"><div className="search-box"><Search size={18} /><input placeholder="Tìm khóa học..." /></div><button className="icon-button"><SlidersHorizontal size={19} /></button></div></header>

        <div className="filter-tabs">{["Tất cả", "A1", "A2", "B1", "B2", "Giao tiếp", "Công việc"].map((item, index) => <button key={item} className={index === 0 ? "active" : ""}>{item}</button>)}</div>

        <section className="course-layout">
          <div className="course-catalog">
            <div className="course-grid">
              {courses.map((course) => <button key={course.id} className={`catalog-card ${course.color} ${selectedCourse === course.id ? "selected" : ""}`} onClick={() => setSelectedCourse(course.id)}>
                <div className="catalog-top"><span className="catalog-icon">{course.icon}</span><span className="course-level">{course.level}</span></div>
                <h3>{course.title}</h3><p>{course.description}</p>
                <div className="tag-row">{course.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="catalog-meta"><span>{course.lessons} bài</span><i /> <span>{course.sentences} câu</span></div>
                {course.progress > 0 && <div className="catalog-progress"><div><i style={{ width: `${course.progress}%` }} /></div><b>{course.progress}%</b></div>}
              </button>)}
            </div>
          </div>

          <aside className="lesson-panel">
            <div className={`lesson-cover ${selected.color}`}><div><span>{selected.icon}</span><i>{selected.level}</i></div><h2>{selected.title}</h2><p>{selected.description}</p><div><span><Clock3 size={14} /> ~8 phút/bài</span><span><Star size={14} /> +{selected.lessons * 100} EXP</span></div></div>
            <div className="lesson-panel-heading"><div><h3>Danh sách bài học</h3><p>{selected.lessons} bài · {selected.sentences} câu</p></div><button><ChevronDown size={18} /></button></div>
            <div className="lesson-list">
              {selected.id === "a1" ? (
                lessons.map((lesson, index) => (
                  <button key={lesson.id} disabled={lesson.locked} onClick={() => onStart(lesson.id)} className={lesson.progress > 0 && !lesson.completed ? "current" : ""}>
                    <span className={`lesson-status ${lesson.completed ? "done" : lesson.locked ? "locked" : "ready"}`}>{lesson.completed ? <Check size={16} /> : lesson.locked ? <LockKeyhole size={14} /> : <Play size={14} fill="currentColor" />}</span>
                    <div><strong>{lesson.title}: {lesson.subtitle}</strong><span>{lesson.progress > 0 ? `${lesson.progress}% hoàn thành` : `${10 + index * 2} câu · +${lesson.exp} EXP`}</span></div>
                    {lesson.progress > 0 && <div className="lesson-mini-progress"><i style={{ width: `${lesson.progress}%` }} /></div>}
                  </button>
                ))
              ) : selected.id === "daily" ? (
                dailyLessons.map((lesson, index) => (
                  <button key={lesson.id} disabled={lesson.locked} onClick={() => onStart(lesson.id)} className={lesson.progress > 0 && !lesson.completed ? "current" : ""}>
                    <span className={`lesson-status ${lesson.completed ? "done" : lesson.locked ? "locked" : "ready"}`}>{lesson.completed ? <Check size={16} /> : lesson.locked ? <LockKeyhole size={14} /> : <Play size={14} fill="currentColor" />}</span>
                    <div><strong>{lesson.title}: {lesson.subtitle}</strong><span>{lesson.progress > 0 ? `${lesson.progress}% hoàn thành` : `10 câu · +${lesson.exp} EXP`}</span></div>
                    {lesson.progress > 0 && <div className="lesson-mini-progress"><i style={{ width: `${lesson.progress}%` }} /></div>}
                  </button>
                ))
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
