"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { Dashboard } from "@/components/dashboard";
import { CourseLibrary } from "@/components/course-library";
import { PracticeStudio } from "@/components/practice-studio";
import { ProgressView } from "@/components/progress-view";
import { LeaderboardView } from "@/components/leaderboard-view";
import { AudioSettings } from "@/components/settings/AudioSettings";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import type { AppView, PracticeMode } from "@/types";

export function ReflexApp() {
  const [view, setView] = useState<AppView>("home");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("typing");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openPractice = (mode: PracticeMode, lessonId?: string) => {
    setPracticeMode(mode);
    setSelectedLessonId(lessonId || null);
    setView("practice");
    setMobileNavOpen(false);
  };

  return (
    <div className="app-shell">
      <AppSidebar
        activeView={view}
        onNavigate={(next) => { setView(next); setMobileNavOpen(false); }}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <main className={view === "practice" ? "app-main practice-main" : "app-main"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {view === "home" && <Dashboard onStart={(mode) => openPractice(mode)} onMenu={() => setMobileNavOpen(true)} onNavigate={setView} />}
            {view === "courses" && <CourseLibrary onStart={(lessonId) => openPractice("typing", lessonId)} onMenu={() => setMobileNavOpen(true)} />}
            {view === "practice" && <PracticeStudio initialMode={practiceMode} lessonId={selectedLessonId} onBack={() => setView("courses")} onMenu={() => setMobileNavOpen(true)} />}
            {view === "progress" && <ProgressView onMenu={() => setMobileNavOpen(true)} />}
            {view === "leaderboard" && <LeaderboardView onMenu={() => setMobileNavOpen(true)} />}
            {view === "settings" && <AudioSettings onMenu={() => setMobileNavOpen(true)} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <UpgradeModal />
    </div>
  );
}

