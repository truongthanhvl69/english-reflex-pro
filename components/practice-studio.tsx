"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BookOpen, Bot, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleAlert, Eraser, Flag, Gauge, Headphones, HelpCircle, Keyboard, Lightbulb, LoaderCircle,
  Menu, Mic2, Pause, Play, Puzzle, RotateCcw, Send, Settings2, Sparkles, Star, Trash2,
  Volume2, X, Zap,
} from "lucide-react";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { playSentence, type VoiceType } from "@/services/ttsService";
import { getAudioSettings, saveAudioSettings, stopAllAudio } from "@/services/audioManager";
import type { PracticeMode } from "@/types";

const modeOptions: { id: PracticeMode; label: string; icon: typeof Keyboard }[] = [
  { id: "typing", label: "Gõ câu", icon: Keyboard },
  { id: "word-bank", label: "Ghép từ", icon: Puzzle },
  { id: "listening", label: "Nghe chép", icon: Headphones },
  { id: "reverse", label: "Dịch ngược", icon: BookOpen },
  { id: "speaking", label: "Phát âm", icon: Mic2 },
];

export function PracticeStudio({ initialMode, lessonId, onBack, onMenu }: { initialMode: PracticeMode; lessonId?: string | null; onBack: () => void; onMenu: () => void }) {
  const session = usePracticeSession(initialMode, lessonId);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showIpa, setShowIpa] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [voice, setVoice] = useState<VoiceType>("us");
  const [speed, setSpeed] = useState(1);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");

  // Sync with global settings on mount
  useEffect(() => {
    const syncSettings = () => {
      const current = getAudioSettings();
      setVoice(current.voiceType);
      setSpeed(current.speedRate);
    };
    syncSettings();
    window.addEventListener("audio_settings_changed", syncSettings);
    return () => window.removeEventListener("audio_settings_changed", syncSettings);
  }, []);

  const handleVoiceChange = (val: VoiceType) => {
    setVoice(val);
    saveAudioSettings({ voiceType: val });
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
    saveAudioSettings({ speedRate: val });
  };

  const play = async (customSpeed = speed) => {
    setAudioLoading(true); setAudioError("");
    try {
      stopAllAudio();
      const settings = getAudioSettings();
      await playSentence(session.sentence.english, {
        voiceType: voice,
        speedRate: customSpeed,
        voiceVolume: settings.voiceVolume,
      });
    }
    catch (error) { setAudioError(error instanceof Error ? error.message : "Chưa thể phát audio."); }
    finally { setAudioLoading(false); }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || session.mode === "speaking") return;
      event.preventDefault();
      if (session.feedback) session.next(); else if (session.answer.trim() || session.selectedWords.length) void session.submit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [session]);

  const prompt = session.mode === "reverse" ? session.sentence.english : session.sentence.vietnamese;

  return (
    <div className="practice-page">
      <header className="practice-topbar">
        <button className="practice-menu" onClick={onMenu}><Menu size={20} /></button>
        <button className="back-link" onClick={onBack}><ArrowLeft size={18} /> Thoát bài</button>
        <div className="practice-progress-wrap"><div className="practice-progress-label"><span>{session.lessonLabel}</span><b>{session.index + 1}/{session.totalQuestions}</b></div><div className="practice-progress"><motion.i animate={{ width: `${session.progress}%` }} /></div></div>
        <div className="practice-stats"><span className="combo-chip"><Zap size={15} fill="currentColor" /> {session.combo} combo</span><span><Star size={16} fill="currentColor" /> {session.exp} EXP</span></div>
        <button className="icon-button"><Settings2 size={19} /></button>
      </header>

      <div className="practice-workspace">
        <div className="mode-switcher">
          {modeOptions.map(({ id, label, icon: Icon }) => <button key={id} className={session.mode === id ? "active" : ""} onClick={() => session.changeMode(id)}><Icon size={16} /><span>{label}</span></button>)}
        </div>

        <motion.section 
          className="exercise-card"
          animate={session.feedback && !session.feedback.correct ? { x: [-8, 8, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="exercise-meta"><span><Sparkles size={14} /> PHẢN XẠ NHANH</span><button onClick={() => setHintOpen((value) => !value)}><HelpCircle size={16} /> Gợi ý</button></div>

          <div className="question-block">
            {session.mode === "listening" ? <ListeningPrompt onPlay={() => play()} loading={audioLoading} hint={hintOpen ? session.sentence.english.slice(0, 1) + "…" : ""} /> :
             session.mode === "speaking" ? <SpeakingPrompt english={session.sentence.english} vietnamese={session.sentence.vietnamese} onPlay={() => play()} loading={audioLoading} /> :
             <><span className="prompt-label">{session.mode === "reverse" ? "DỊCH SANG TIẾNG VIỆT" : "DỊCH TỰ NHIÊN SANG TIẾNG ANH"}</span><h1>{prompt}</h1>{showIpa && session.sentence.ipa && <p className="ipa-line">{session.sentence.ipa}</p>}{hintOpen && <div className="inline-hint"><Lightbulb size={16} /> {session.sentence.grammarNote}</div>}</>}
          </div>

          {session.mode === "word-bank" ? <WordBank session={session} /> :
           session.mode === "speaking" ? <SpeakingRecorder onComplete={() => { session.completeSpeaking(); session.setFeedback({ correct: true, title: "Phát âm rất rõ!", message: "Nhịp nói tự nhiên. Âm cuối có thể chắc hơn một chút.", correctAnswer: session.sentence.english, memoryTip: "Nối nhẹ âm cuối với từ kế tiếp để câu liền mạch hơn." }); }} /> :
           <div className="answer-area"><textarea autoFocus value={session.answer} onChange={(event) => session.setAnswer(event.target.value)} placeholder={session.mode === "listening" ? "Gõ lại câu bạn vừa nghe…" : session.mode === "reverse" ? "Nhập câu tiếng Việt tự nhiên…" : "Nhập câu tiếng Anh của bạn…"} /><div className="answer-footer"><span>Nhấn <kbd>Enter ↵</kbd> để kiểm tra</span><button onClick={() => session.setAnswer("")} disabled={!session.answer}><Eraser size={16} /> Xóa</button></div></div>}

          {audioError && <div className="audio-error"><CircleAlert size={15} /> {audioError}</div>}

          <div className="exercise-actions">
            <div className="audio-controls">
              <button className="round-audio" onClick={() => play()} disabled={audioLoading}>
                {audioLoading ? <LoaderCircle className="spin" size={20} /> : <Volume2 size={20} />}
              </button>
              <select value={voice} onChange={(e) => handleVoiceChange(e.target.value as VoiceType)} aria-label="Chọn giọng">
                <option value="female">Giọng Nữ chuẩn</option>
                <option value="male">Giọng Nam chuẩn</option>
                <option value="us">Anh - Mỹ (US)</option>
                <option value="uk">Anh - Anh (UK)</option>
              </select>
              <select value={speed} onChange={(e) => handleSpeedChange(Number(e.target.value))} aria-label="Tốc độ">
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
              </select>
            </div>
            {session.mode !== "speaking" && <button className="button button-primary check-button" disabled={session.mode === "word-bank" ? !session.selectedWords.length : !session.answer.trim()} onClick={() => void session.submit()}>Kiểm tra <span>Enter ↵</span></button>}
          </div>
        </motion.section>

        <button className={`tools-toggle ${toolsOpen ? "active" : ""}`} onClick={() => setToolsOpen((value) => !value)}><Settings2 size={17} /> Công cụ & điều hướng <ChevronDown size={17} /></button>
        <AnimatePresence>{toolsOpen && <motion.div className="tools-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}><button onClick={() => session.setFeedback({ correct: false, title: "Đáp án tham khảo", message: "Một cách diễn đạt tự nhiên:", correctAnswer: session.sentence.english })}><BookOpen size={17} /> Xem đáp án</button><button onClick={() => setShowIpa((value) => !value)}><Gauge size={17} /> Xem IPA</button><button onClick={() => play(0.75)}><Volume2 size={17} /> Nghe chậm</button><button><Bot size={17} /> Giải thích AI</button><button><Send size={17} /> Báo lỗi</button><div className="tool-nav"><button onClick={session.previous}><ChevronLeft size={17} /> Câu trước</button><button onClick={session.next}>Câu sau <ChevronRight size={17} /></button></div></motion.div>}</AnimatePresence>
      </div>

      <AnimatePresence>{session.feedback && <FeedbackSheet feedback={session.feedback} markedHard={session.markedHard} onToggleHard={session.toggleMarkedHard} onClose={() => session.setFeedback(null)} onNext={session.next} />}</AnimatePresence>
    </div>
  );
}

function ListeningPrompt({ onPlay, loading, hint }: { onPlay: () => void; loading: boolean; hint: string }) {
  return <div className="listening-prompt"><button onClick={onPlay} disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <Play fill="currentColor" />}</button><div className="listening-copy"><span>NGHE VÀ GÕ LẠI</span><h2>Chạm để nghe câu tiếng Anh</h2>{hint && <p>Gợi ý: bắt đầu bằng “{hint}”</p>}</div><div className="sound-wave">{[13, 24, 35, 19, 42, 28, 16, 33, 23, 12].map((h, i) => <i key={i} style={{ height: h }} />)}</div></div>;
}

function SpeakingPrompt({ english, vietnamese, onPlay, loading }: { english: string; vietnamese: string; onPlay: () => void; loading: boolean }) {
  return <div className="speaking-prompt"><span>NGHE, SAU ĐÓ NÓI LẠI</span><h1>{english}</h1><p>{vietnamese}</p><button onClick={onPlay}>{loading ? <LoaderCircle className="spin" size={18} /> : <Volume2 size={18} />} Nghe mẫu</button></div>;
}

function WordBank({ session }: { session: ReturnType<typeof usePracticeSession> }) {
  const selectedIds = new Set(session.selectedWords.map((item) => item.id));
  return <div className="word-bank-wrap"><div className={`word-answer-zone ${session.selectedWords.length ? "has-words" : ""}`}>{!session.selectedWords.length && <span>Chạm các từ bên dưới để ghép câu</span>}{session.selectedWords.map((item) => <motion.button layout key={item.id} onClick={() => session.setSelectedWords((words) => words.filter((word) => word.id !== item.id))}>{item.word}<X size={13} /></motion.button>)}</div><div className="word-pool">{session.shuffledWords.map((item) => <motion.button layout whileTap={{ scale: 0.92 }} key={item.id} disabled={selectedIds.has(item.id)} onClick={() => session.setSelectedWords((words) => [...words, item])}>{item.word}</motion.button>)}</div><button className="reset-words" onClick={() => session.setSelectedWords([])}><RotateCcw size={15} /> Làm lại</button></div>;
}

function SpeakingRecorder({ onComplete }: { onComplete: () => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const toggle = async () => {
    if (recording) { recorder.current?.stop(); setRecording(false); window.setTimeout(onComplete, 500); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder.current = new MediaRecorder(stream);
      recorder.current.onstop = () => stream.getTracks().forEach((track) => track.stop());
      recorder.current.start(); setSeconds(0); setRecording(true);
    } catch { alert("Hãy cho phép truy cập micro để luyện phát âm."); }
  };

  return <div className="recorder"><div className={`record-viz ${recording ? "active" : ""}`}>{[18, 30, 45, 24, 55, 37, 20, 48, 32, 17, 27, 42].map((h, i) => <i key={i} style={{ height: recording ? h : 8 }} />)}</div><button className={recording ? "recording" : ""} onClick={toggle}>{recording ? <Pause fill="currentColor" /> : <Mic2 />}<span>{recording ? `Dừng · 00:${String(seconds).padStart(2, "0")}` : "Bắt đầu ghi âm"}</span></button><p>AI sẽ đánh giá phát âm, độ trôi chảy và ngữ điệu</p></div>;
}

function FeedbackSheet({ feedback, markedHard, onToggleHard, onClose, onNext }: { feedback: NonNullable<ReturnType<typeof usePracticeSession>["feedback"]>; markedHard: boolean; onToggleHard: () => void; onClose: () => void; onNext: () => void }) {
  return <motion.div className={`feedback-sheet ${feedback.correct ? "success" : "error"}`} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}><div className="feedback-inner"><div className="feedback-symbol">{feedback.correct ? <Check size={25} /> : <Lightbulb size={24} />}</div><div className="feedback-copy"><div className="feedback-title"><h3>{feedback.title}</h3><button onClick={onClose}><X size={19} /></button></div><p>{feedback.message}</p><div className="correct-answer"><span>ĐÁP ÁN TỰ NHIÊN</span><strong>{feedback.correctAnswer}</strong></div><button className={`mark-hard-button ${markedHard ? "active" : ""}`} onClick={onToggleHard}><Flag size={14} fill={markedHard ? "currentColor" : "none"} /> {markedHard ? "Đã đánh dấu khó" : "Đánh dấu câu khó"}</button>{feedback.explanation && <div className="feedback-detail"><Bot size={17} /><div><b>Reflex AI phân tích</b><p>{feedback.explanation}</p>{feedback.memoryTip && <p><strong>Mẹo nhớ:</strong> {feedback.memoryTip}</p>}</div></div>}</div><button className="button feedback-next" onClick={onNext}>Tiếp tục <ArrowRight size={18} /></button></div></motion.div>;
}
