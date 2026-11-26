import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Clock,
  Eraser,
  Flag,
  Grid,
  Image as ImageIcon,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  X,
  ZoomIn,
} from 'lucide-react';
import type {
  MockTestRecord,
  QuestionPaletteState,
  StudentAnswerValue,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePlatformData } from '../../context/PlatformDataContext';
import { ThemeContext } from '../../context/ThemeProvider';
import {
  evaluateFullAttempt,
  getPaletteState,
  isQuestionAnswered,
} from '../../utils/scoringEngine';
import {
  getEffectiveTestInstructions,
  getEffectiveTestSyllabus,
} from '../../utils/examPresets';
import {
  resolveOptionImageSrc,
  resolveQuestionImageSrc,
} from '../../utils/questionImageRenderer';
import { playClick, playSuccess, playWarning } from '../../utils/soundEffects';
import { makeSafeDocId } from '../../services/firestoreService';
import { ReusableButton } from '../ReusableButton';
import { ReusableCard } from '../ReusableCard';
import { QuestionZoomModal, type QuestionZoomPayload } from './QuestionZoomModal';
import { ProTestAnalysisDashboard } from '../analytics/ProTestAnalysisDashboard';

interface CbtExamRunnerProps {
  test: MockTestRecord;
  questions: TestQuestionRecord[];
  onExit: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const PALETTE_STYLE: Record<
  QuestionPaletteState,
  { badge: string; label: string; dot: string }
> = {
  'not-visited': {
    badge:
      'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    label: 'Not Visited',
    dot: 'bg-slate-300 dark:bg-slate-600',
  },
  'not-answered': {
    badge:
      'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700',
    label: 'Not Answered',
    dot: 'bg-rose-500',
  },
  answered: {
    badge:
      'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700',
    label: 'Answered',
    dot: 'bg-emerald-500',
  },
  'marked-review': {
    badge:
      'bg-violet-100 text-violet-900 border-violet-400 dark:bg-violet-950/70 dark:text-violet-200 dark:border-violet-700',
    label: 'Marked for Review',
    dot: 'bg-violet-500',
  },
  'answered-marked': {
    badge:
      'bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-600',
    label: 'Answered & Marked',
    dot: 'bg-[#2563EB]',
  },
};

function makeEmptyAnswer(q: TestQuestionRecord): StudentAnswerValue {
  if (q.questionType === 'single-mcq') {
    return { type: 'single-mcq', selectedIndex: null };
  }
  if (q.questionType === 'multi-mcq') {
    return { type: 'multi-mcq', selectedIndices: [] };
  }
  return { type: 'integer', value: '' };
}

export function CbtExamRunner({ test, questions, onExit }: CbtExamRunnerProps) {
  const { firebaseUser } = useAuth();
  const { iqConfig, recordAttempt } = usePlatformData();
  const imageTheme = useContext(ThemeContext)?.theme === 'dark' ? 'dark' : 'light';
  const [imageViewMode, setImageViewMode] = useState(true);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.questionNumber - b.questionNumber),
    [questions]
  );

  const effectiveInstructions = useMemo(() => getEffectiveTestInstructions(test), [test]);
  const effectiveSyllabus = useMemo(
    () => getEffectiveTestSyllabus(test, sortedQuestions),
    [sortedQuestions, test]
  );

  const subjects = useMemo(() => {
    const ordered: string[] = [];
    for (const q of sortedQuestions) {
      if (!ordered.includes(q.subjectName)) ordered.push(q.subjectName);
    }
    return ordered;
  }, [sortedQuestions]);

  const draftKey = `prepskm_exam_draft_${test.id}`;
  const totalDurationSec = Math.max(60, test.durationMinutes * 60);

  // Pre-exam instructions gate for all CBT exams (and DPPs can begin immediately or read instructions)
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [agreedInstructions, setAgreedInstructions] = useState(true);
  const [showSyllabusDrawer, setShowSyllabusDrawer] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerValue>>(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { answers?: Record<string, StudentAnswerValue> };
        if (parsed.answers) return parsed.answers;
      }
    } catch {
      // ignore
    }
    return {};
  });
  const [visitedIds, setVisitedIds] = useState<Record<string, boolean>>(() => {
    const first = sortedQuestions[0];
    return first ? { [first.id]: true } : {};
  });
  const [markedIds, setMarkedIds] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { remainingSeconds?: number };
        if (typeof parsed.remainingSeconds === 'number' && parsed.remainingSeconds > 10) {
          return Math.min(totalDurationSec, parsed.remainingSeconds);
        }
      }
    } catch {
      // ignore
    }
    return totalDurationSec;
  });

  // Exam Room-Exit Proctoring Warning state
  const [roomExitWarnings, setRoomExitWarnings] = useState(0);
  const [exitWarningModal, setExitWarningModal] = useState<{
    open: boolean;
    reason: string;
    allowForceExit: boolean;
  }>({ open: false, reason: '', allowForceExit: false });
  const exitWarningsRef = useRef(0);
  const lastWarningAtRef = useRef(0);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [zoomPayload, setZoomPayload] = useState<QuestionZoomPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAttempt, setSubmittedAttempt] = useState<TestAttemptRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const questionSecondsRef = useRef<Record<string, number>>({});
  const openedAtRef = useRef<Record<string, number>>({});
  const answeredAtRef = useRef<Record<string, number | null>>({});
  const hasSubmittedRef = useRef(false);
  const currentQ = sortedQuestions[currentIndex];

  const triggerRoomExitWarning = useCallback((reason: string, allowForceExit = false) => {
    const now = Date.now();
    // Deduplicate rapid blur + visibilitychange bursts within 1.2s
    if (!allowForceExit && now - lastWarningAtRef.current < 1200) {
      return;
    }
    lastWarningAtRef.current = now;
    exitWarningsRef.current += 1;
    setRoomExitWarnings(exitWarningsRef.current);
    playWarning();
    setExitWarningModal({
      open: true,
      reason,
      allowForceExit,
    });
  }, []);

  // Exam Room-Exit Protection: warn if student switches tab, loses focus, or refreshes during active exam
  useEffect(() => {
    if (!hasStartedExam || submittedAttempt || sortedQuestions.length === 0) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerRoomExitWarning(
          'You switched away from the exam tab. Leaving the CBT exam room is recorded on your scorecard.'
        );
      }
    };

    const handleWindowBlur = () => {
      triggerRoomExitWarning(
        'Exam window lost focus. Keep the PREPSKM CBT room active until you submit your test.'
      );
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your CBT exam is still in progress. Are you sure you want to leave the exam room?';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasStartedExam, sortedQuestions.length, submittedAttempt, triggerRoomExitWarning]);

  // Record first open timestamp for current question
  useEffect(() => {
    if (!hasStartedExam || !currentQ || submittedAttempt) return;
    setVisitedIds((prev) => (prev[currentQ.id] ? prev : { ...prev, [currentQ.id]: true }));
    if (!openedAtRef.current[currentQ.id]) {
      openedAtRef.current[currentQ.id] = Date.now();
    }
  }, [currentQ, hasStartedExam, submittedAttempt]);

  // Auto-save answers & remaining time to localStorage
  useEffect(() => {
    if (!hasStartedExam || submittedAttempt) return;
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ answers, remainingSeconds })
      );
    } catch {
      // ignore
    }
  }, [answers, remainingSeconds, draftKey, hasStartedExam, submittedAttempt]);

  const executeSubmit = useCallback(async () => {
    if (hasSubmittedRef.current || sortedQuestions.length === 0) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setShowConfirmModal(false);
    setExitWarningModal({ open: false, reason: '', allowForceExit: false });

    try {
      const elapsedSec = Math.max(1, totalDurationSec - remainingSeconds);
      const baseAttempt = evaluateFullAttempt({
        attemptId: makeSafeDocId('attempt'),
        userId: firebaseUser?.uid ?? 'guest',
        test,
        questions: sortedQuestions,
        answers,
        questionSecondsMap: { ...questionSecondsRef.current },
        openedAtMap: { ...openedAtRef.current },
        answeredAtMap: { ...answeredAtRef.current },
        totalTimeSeconds: elapsedSec,
        iqConfig,
      });

      const attempt: TestAttemptRecord = {
        ...baseAttempt,
        roomExitWarnings: exitWarningsRef.current,
      };

      await recordAttempt(attempt);
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      playSuccess();
      setSubmittedAttempt(attempt);
    } catch (err) {
      hasSubmittedRef.current = false;
      setSubmitError(err instanceof Error ? err.message : 'Failed to save attempt. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    answers,
    draftKey,
    firebaseUser?.uid,
    iqConfig,
    recordAttempt,
    remainingSeconds,
    sortedQuestions,
    test,
    totalDurationSec,
  ]);

  // Countdown timer + per-question active seconds ticker
  useEffect(() => {
    if (!hasStartedExam || submittedAttempt || sortedQuestions.length === 0) return;

    const timer = window.setInterval(() => {
      if (currentQ) {
        questionSecondsRef.current[currentQ.id] =
          (questionSecondsRef.current[currentQ.id] ?? 0) + 1;
      }
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void executeSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQ, executeSubmit, hasStartedExam, sortedQuestions.length, submittedAttempt]);

  const updateAnswer = (q: TestQuestionRecord, next: StudentAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [q.id]: next }));
    answeredAtRef.current[q.id] = isQuestionAnswered(next) ? Date.now() : null;
  };

  const handleSelectSingle = (q: TestQuestionRecord, optionIdx: number) => {
    playClick();
    updateAnswer(q, { type: 'single-mcq', selectedIndex: optionIdx });
  };

  const handleToggleMulti = (q: TestQuestionRecord, optionIdx: number) => {
    playClick();
    const existing = answers[q.id];
    const current = existing?.type === 'multi-mcq' ? existing.selectedIndices : [];
    const nextIndices = current.includes(optionIdx)
      ? current.filter((i) => i !== optionIdx)
      : [...current, optionIdx].sort((a, b) => a - b);
    updateAnswer(q, { type: 'multi-mcq', selectedIndices: nextIndices });
  };

  const handleIntegerChange = (q: TestQuestionRecord, val: string) => {
    const cleaned = val.replace(/[^0-9.\-]/g, '').slice(0, 14);
    updateAnswer(q, { type: 'integer', value: cleaned });
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    playClick();
    updateAnswer(currentQ, makeEmptyAnswer(currentQ));
  };

  const handleMarkAndNext = () => {
    if (!currentQ) return;
    playClick();
    setMarkedIds((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
    if (currentIndex < sortedQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSaveAndNext = () => {
    if (!currentQ) return;
    playClick();
    setMarkedIds((prev) => {
      if (!prev[currentQ.id]) return prev;
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
    if (currentIndex < sortedQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleReattempt = () => {
    playClick();
    hasSubmittedRef.current = false;
    questionSecondsRef.current = {};
    openedAtRef.current = {};
    answeredAtRef.current = {};
    exitWarningsRef.current = 0;
    setRoomExitWarnings(0);
    setAnswers({});
    setMarkedIds({});
    setVisitedIds(sortedQuestions[0] ? { [sortedQuestions[0].id]: true } : {});
    setCurrentIndex(0);
    setRemainingSeconds(totalDurationSec);
    setSubmittedAttempt(null);
    setSubmitError(null);
    setHasStartedExam(false);
  };

  const paletteCounts = useMemo(() => {
    const counts: Record<QuestionPaletteState, number> = {
      'not-visited': 0,
      'not-answered': 0,
      answered: 0,
      'marked-review': 0,
      'answered-marked': 0,
    };
    for (const q of sortedQuestions) {
      const st = getPaletteState(Boolean(visitedIds[q.id]), Boolean(markedIds[q.id]), answers[q.id]);
      counts[st] += 1;
    }
    return counts;
  }, [answers, markedIds, sortedQuestions, visitedIds]);

  if (sortedQuestions.length === 0) {
    return (
      <ReusableCard className="max-w-xl mx-auto my-10 text-center">
        <AlertTriangle className="w-10 h-10 text-[#F97316] mx-auto mb-3" />
        <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
          No Questions Linked to This Test Yet
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          An administrator needs to add questions and publish this test before it can be attempted.
        </p>
        <div className="mt-5">
          <ReusableButton variant="secondary" onClick={onExit}>
            <ArrowLeft className="w-4 h-4" />
            Back to Test Catalog
          </ReusableButton>
        </div>
      </ReusableCard>
    );
  }

  // ==================================================
  // PRE-EXAM EXAM-SPECIFIC INSTRUCTIONS & SYLLABUS GATE
  // ==================================================
  if (!hasStartedExam && !submittedAttempt) {
    const resolvedExamType = test.examType ?? test.examCategory;
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#2563EB]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {test.destination === 'cbt-mock' ? 'CBT Mocks' : 'Chapter DPPs'}
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
            {resolvedExamType} · {test.examCategory}
          </span>
        </div>

        <ReusableCard className="space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
              Official Exam Briefing & Room Rules
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-1">
              {test.title}
            </h1>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                <p className="text-slate-500 dark:text-slate-400">Questions</p>
                <p className="font-mono text-base font-bold text-[#0B1B3B] dark:text-white mt-0.5">
                  {sortedQuestions.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                <p className="text-slate-500 dark:text-slate-400">Duration</p>
                <p className="font-mono text-base font-bold text-[#0B1B3B] dark:text-white mt-0.5">
                  {test.durationMinutes} min
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                <p className="text-slate-500 dark:text-slate-400">Total Marks</p>
                <p className="font-mono text-base font-bold text-[#0B1B3B] dark:text-white mt-0.5">
                  {test.totalMarks}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                <p className="text-slate-500 dark:text-slate-400">Marking Scheme</p>
                <p className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  +{test.positiveMarks} / {test.negativeMarkingEnabled ? `−${test.negativeMarks}` : '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Exam-Specific Instructions */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#F97316]" />
              {resolvedExamType} Instructions
            </h2>
            <ol className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 list-decimal pl-5 leading-relaxed">
              {effectiveInstructions.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </div>

          {/* Test Syllabus Breakdown */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2563EB] dark:text-sky-400" />
              Test Syllabus Covered
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {effectiveSyllabus.map((item) => (
                <div
                  key={item.subject}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB] dark:text-sky-400">
                    {item.subject}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {item.chapters.map((ch) => (
                      <li key={ch} className="flex items-start gap-1.5">
                        <span className="text-[#10B981] font-bold">•</span>
                        <span>{ch}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Room-Exit Warning Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-[#F97316] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Exam Room Integrity Guard Active</p>
              <p className="mt-0.5">
                Once you enter the CBT room, switching tabs, minimizing the browser, or attempting to exit early triggers an immediate audible Room-Exit Warning and records the count on your official report.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="inline-flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedInstructions}
                onChange={(e) => setAgreedInstructions(e.target.checked)}
                className="mt-1 rounded border-slate-300 accent-[#2563EB]"
              />
              <span>
                I have read the {resolvedExamType} instructions and agree to remain inside the exam room until submission.
              </span>
            </label>

            <ReusableButton
              variant="accent"
              disabled={!agreedInstructions}
              onClick={() => {
                playSuccess();
                setHasStartedExam(true);
              }}
              className="shrink-0"
            >
              <Play className="w-4 h-4" />
              Begin Exam Now
            </ReusableButton>
          </div>
        </ReusableCard>
      </div>
    );
  }

  // ==================================================
  // POST-SUBMISSION PRO TEST ANALYSIS & SOLUTIONS
  // ==================================================
  if (submittedAttempt) {
    return (
      <div className="space-y-6">
        <ProTestAnalysisDashboard
          attempt={submittedAttempt}
          questions={sortedQuestions}
          iqConfig={iqConfig}
          examCategory={test.examType ?? test.examCategory}
          headerActions={
            <>
              <ReusableButton variant="secondary" size="sm" onClick={handleReattempt}>
                <RotateCcw className="w-4 h-4" />
                Reattempt
              </ReusableButton>
              <ReusableButton variant="secondary" size="sm" to="/analytics">
                <BarChart3 className="w-4 h-4" />
                All Analytics
              </ReusableButton>
              <ReusableButton variant="ghost" size="sm" onClick={onExit}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </ReusableButton>
            </>
          }
        />
      </div>
    );
  }

  // ==================================================
  // ACTIVE NTA-STYLE CBT EXAM INTERFACE
  // ==================================================
  const currentAnswer = answers[currentQ.id];
  const lowTime = remainingSeconds <= 300;
  const activeSubject = currentQ.subjectName;
  const resolvedQuestionImg = resolveQuestionImageSrc(currentQ, imageTheme);

  const renderPaletteContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        {(Object.keys(PALETTE_STYLE) as QuestionPaletteState[]).map((state) => (
          <div key={state} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PALETTE_STYLE[state].dot}`} />
            <span className="truncate">{PALETTE_STYLE[state].label}</span>
            <span className="ml-auto font-mono font-semibold tabular-nums">
              {paletteCounts[state]}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2.5">
          Question Palette ({sortedQuestions.length})
        </p>
        <div className="grid grid-cols-5 gap-2">
          {sortedQuestions.map((q, idx) => {
            const pState = getPaletteState(
              Boolean(visitedIds[q.id]),
              Boolean(markedIds[q.id]),
              answers[q.id]
            );
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  playClick();
                  setCurrentIndex(idx);
                  setShowMobilePalette(false);
                }}
                aria-label={`Jump to Question ${q.questionNumber} (${PALETTE_STYLE[pState].label})`}
                className={`h-10 rounded-xl border text-xs font-mono font-bold tabular-nums transition-all ${
                  PALETTE_STYLE[pState].badge
                } ${isCurrent ? 'ring-2 ring-[#2563EB] dark:ring-sky-400 ring-offset-2 dark:ring-offset-[#111A2E]' : ''}`}
              >
                {q.questionNumber}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <ReusableButton
          variant="accent"
          className="w-full"
          disabled={isSubmitting}
          onClick={() => setShowConfirmModal(true)}
        >
          <Send className="w-4 h-4" />
          Submit Test
        </ReusableButton>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Exam Bar */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                triggerRoomExitWarning(
                  'You attempted to exit the active CBT exam room before submitting. Leaving early will discard unsaved progress unless you submit.',
                  true
                )
              }
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit Room
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">
              {test.examType ?? test.examCategory}
            </span>
            {roomExitWarnings > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {roomExitWarnings} Warning{roomExitWarnings > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white truncate mt-0.5">
            {test.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSyllabusDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">Syllabus</span>
          </button>

          <div
            aria-label="Time remaining"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-sm sm:text-base font-bold tabular-nums border ${
              lowTime
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                : 'bg-slate-50 text-[#0B1B3B] border-slate-200 dark:bg-slate-900 dark:text-sky-300 dark:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            {formatClock(remainingSeconds)}
          </div>

          <button
            type="button"
            onClick={() => setShowMobilePalette(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <Grid className="w-4 h-4" />
            Palette
          </button>

          <ReusableButton
            variant="accent"
            size="sm"
            className="hidden sm:inline-flex"
            disabled={isSubmitting}
            onClick={() => setShowConfirmModal(true)}
          >
            <Send className="w-4 h-4" />
            Submit
          </ReusableButton>
        </div>
      </div>

      {/* Subject Switcher Tabs */}
      {subjects.length > 1 && (
        <div role="tablist" aria-label="Exam subjects" className="flex items-center gap-2 overflow-x-auto pb-1">
          {subjects.map((sub) => {
            const isSubActive = sub === activeSubject;
            const firstIdx = sortedQuestions.findIndex((q) => q.subjectName === sub);
            const subAnswered = sortedQuestions.filter(
              (q) => q.subjectName === sub && isQuestionAnswered(answers[q.id])
            ).length;
            const subTotal = sortedQuestions.filter((q) => q.subjectName === sub).length;
            return (
              <button
                key={sub}
                role="tab"
                aria-selected={isSubActive}
                type="button"
                onClick={() => {
                  playClick();
                  if (firstIdx >= 0) setCurrentIndex(firstIdx);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors border ${
                  isSubActive
                    ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:text-white dark:border-[#2563EB]'
                    : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                {sub}{' '}
                <span className="ml-1.5 font-mono text-xs opacity-80 tabular-nums">
                  ({subAnswered}/{subTotal})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {submitError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-200">
          {submitError}
        </div>
      )}

      {/* Main Two-Column Exam Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <ReusableCard className="lg:col-span-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-base font-bold text-[#0B1B3B] dark:text-white">
                Question {currentQ.questionNumber}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {currentQ.subjectName}
                {currentQ.chapterName ? ` · ${currentQ.chapterName}` : ''}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
              <span className="text-slate-600 dark:text-slate-300">
                {currentQ.questionType === 'single-mcq'
                  ? 'Single Choice MCQ'
                  : currentQ.questionType === 'multi-mcq'
                    ? 'Multiple Correct MCQ'
                    : 'Integer / Numerical'}
              </span>
              <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                +{currentQ.positiveMarks ?? test.positiveMarks}
              </span>
              <span className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                {test.negativeMarkingEnabled
                  ? `-${currentQ.negativeMarks ?? test.negativeMarks}`
                  : '0'}
              </span>
              <button
                type="button"
                aria-pressed={imageViewMode}
                aria-label={imageViewMode ? 'Switch to text format' : 'Switch to image format'}
                onClick={() => {
                  playClick();
                  setImageViewMode((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 min-h-9 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  imageViewMode
                    ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:border-sky-400 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{imageViewMode ? 'Image Format' : 'Text Format'}</span>
              </button>
              <button
                type="button"
                aria-label={`Zoom Question ${currentQ.questionNumber}`}
                onClick={() => {
                  playClick();
                  setZoomPayload({
                    title: `Question ${currentQ.questionNumber} — ${currentQ.subjectName}`,
                    subtitle: currentQ.chapterName,
                    imageUrl: resolvedQuestionImg.src,
                    text: currentQ.questionText,
                    optionTexts: currentQ.optionTexts,
                    kind: 'question',
                  });
                }}
                className="inline-flex items-center gap-1.5 min-h-9 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-blue-50 hover:border-[#2563EB] hover:text-[#2563EB] dark:bg-slate-900 dark:hover:bg-blue-950/60 dark:hover:border-sky-400 dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Zoom</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {imageViewMode ? (
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182D] p-2 sm:p-2.5 overflow-x-auto">
                <img
                  data-testid="cbt-question-image"
                  src={resolvedQuestionImg.src}
                  alt={resolvedQuestionImg.alt}
                  onClick={() => {
                    playClick();
                    setZoomPayload({
                      title: `Question ${currentQ.questionNumber} — ${currentQ.subjectName}`,
                      subtitle: currentQ.chapterName,
                      imageUrl: resolvedQuestionImg.src,
                      kind: 'question',
                    });
                  }}
                  className="w-full max-w-[760px] h-auto object-contain mx-auto cursor-zoom-in rounded-lg"
                />
              </div>
            ) : (
              <>
                {currentQ.questionImageUrl && (
                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-2.5 sm:p-3 overflow-x-auto">
                    <img
                      data-testid="cbt-question-image"
                      src={currentQ.questionImageUrl}
                      alt={`Question ${currentQ.questionNumber}`}
                      onClick={() => {
                        playClick();
                        setZoomPayload({
                          title: `Question ${currentQ.questionNumber} — ${currentQ.subjectName}`,
                          subtitle: currentQ.chapterName,
                          imageUrl: currentQ.questionImageUrl,
                          kind: 'question',
                        });
                      }}
                      className="w-full max-w-[740px] h-auto object-contain mx-auto cursor-zoom-in"
                    />
                  </div>
                )}
                {currentQ.questionText &&
                  !(
                    currentQ.questionImageUrl?.startsWith('/assets/mocks/') ||
                    currentQ.questionImageUrl?.includes('data-composite-question')
                  ) && (
                    <div className="text-base leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-line">
                      {currentQ.questionText}
                    </div>
                  )}
              </>
            )}
          </div>

          {currentQ.questionType === 'integer' ? (
            <div className="pt-2 space-y-3 max-w-sm">
              <label
                htmlFor={`integer-input-${currentQ.id}`}
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Enter Numerical Answer
              </label>
              <input
                id={`integer-input-${currentQ.id}`}
                type="text"
                inputMode="decimal"
                placeholder="e.g. 42 or 3.14"
                value={currentAnswer?.type === 'integer' ? currentAnswer.value : ''}
                onChange={(e) => handleIntegerChange(currentQ, e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-lg font-semibold text-[#0B1B3B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Digits, decimal point, and negative sign are supported. Auto-saved immediately.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {currentQ.questionType === 'multi-mcq' && (
                <p className="text-xs font-medium text-[#2563EB] dark:text-sky-400">
                  One or more options may be correct. Select all matching options.
                </p>
              )}
              {imageViewMode ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Select Correct Option (Image Format)
                  </p>
                  <div
                    className={
                      currentQ.questionImageUrl?.startsWith('/assets/mocks/') &&
                      !(currentQ.optionTexts ?? []).some(Boolean) &&
                      !(currentQ.optionImageUrls ?? []).some(Boolean)
                        ? 'grid grid-cols-2 sm:grid-cols-4 gap-2.5'
                        : 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                    }
                  >
                    {OPTION_LETTERS.map((letter, idx) => {
                      const isSelected =
                        currentQ.questionType === 'single-mcq'
                          ? currentAnswer?.type === 'single-mcq' && currentAnswer.selectedIndex === idx
                          : currentAnswer?.type === 'multi-mcq' &&
                            currentAnswer.selectedIndices.includes(idx);

                      const resolvedOpt = resolveOptionImageSrc(currentQ, idx, {
                        theme: imageTheme,
                        state: isSelected ? 'selected' : 'default',
                      });

                      return (
                        <button
                          key={letter}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={resolvedOpt.alt}
                          onClick={() =>
                            currentQ.questionType === 'single-mcq'
                              ? handleSelectSingle(currentQ, idx)
                              : handleToggleMulti(currentQ, idx)
                          }
                          className={`w-full text-left rounded-xl transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                            resolvedOpt.isCustomImage
                              ? `p-2.5 border flex items-center gap-3 ${
                                  isSelected
                                    ? 'border-[#2563EB] bg-blue-50/70 dark:border-sky-400 dark:bg-blue-950/40 ring-1 ring-[#2563EB]'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                                }`
                              : `p-0.5 border border-transparent hover:scale-[1.005] ${
                                  isSelected ? 'ring-2 ring-[#2563EB] dark:ring-sky-400' : ''
                                }`
                          }`}
                        >
                          {resolvedOpt.isCustomImage && (
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-[#2563EB] text-white'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {letter}
                            </span>
                          )}
                          <img
                            data-testid={`cbt-option-image-${letter}`}
                            src={resolvedOpt.src}
                            alt={resolvedOpt.alt}
                            className={
                              resolvedOpt.isCustomImage
                                ? 'max-h-28 w-auto object-contain rounded-lg bg-white'
                                : 'w-full h-auto object-contain rounded-xl block'
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : currentQ.questionImageUrl?.startsWith('/assets/mocks/') ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Select Correct Option
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {OPTION_LETTERS.map((letter, idx) => {
                      const isSelected =
                        currentQ.questionType === 'single-mcq'
                          ? currentAnswer?.type === 'single-mcq' && currentAnswer.selectedIndex === idx
                          : currentAnswer?.type === 'multi-mcq' &&
                            currentAnswer.selectedIndices.includes(idx);

                      return (
                        <button
                          key={letter}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            currentQ.questionType === 'single-mcq'
                              ? handleSelectSingle(currentQ, idx)
                              : handleToggleMulti(currentQ, idx)
                          }
                          className={`px-4 py-3 rounded-xl border font-semibold transition-all flex items-center justify-center gap-2.5 ${
                            isSelected
                              ? 'border-[#2563EB] bg-blue-50 text-[#0B1B3B] dark:border-sky-400 dark:bg-blue-950/60 dark:text-white shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'bg-[#2563EB] text-white'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="text-sm">Option {letter}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                OPTION_LETTERS.map((letter, idx) => {
                  const optText = currentQ.optionTexts?.[idx];
                  const optImg = currentQ.optionImageUrls?.[idx];
                  const isSelected =
                    currentQ.questionType === 'single-mcq'
                      ? currentAnswer?.type === 'single-mcq' && currentAnswer.selectedIndex === idx
                      : currentAnswer?.type === 'multi-mcq' &&
                        currentAnswer.selectedIndices.includes(idx);

                  return (
                    <button
                      key={letter}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        currentQ.questionType === 'single-mcq'
                          ? handleSelectSingle(currentQ, idx)
                          : handleToggleMulti(currentQ, idx)
                      }
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/70 dark:border-sky-400 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {letter}
                      </span>
                      <div className="flex-1 min-w-0 space-y-2">
                        {optImg && (
                          <img
                            src={optImg}
                            alt={`Option ${letter}`}
                            className="max-h-28 rounded-lg bg-white object-contain border border-slate-200"
                          />
                        )}
                        {optText && (
                          <span className="block text-sm sm:text-base text-slate-800 dark:text-slate-100">
                            {optText}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <ReusableButton
                variant="secondary"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => {
                  playClick();
                  setCurrentIndex((i) => Math.max(0, i - 1));
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </ReusableButton>
              <ReusableButton variant="secondary" size="sm" onClick={handleClearResponse}>
                <Eraser className="w-4 h-4" />
                Clear Response
              </ReusableButton>
              <ReusableButton variant="secondary" size="sm" onClick={handleMarkAndNext}>
                <Bookmark className="w-4 h-4" />
                {markedIds[currentQ.id] ? 'Unmark Review' : 'Mark for Review & Next'}
              </ReusableButton>
            </div>

            <div className="flex items-center gap-2">
              {currentIndex < sortedQuestions.length - 1 ? (
                <ReusableButton variant="primary" size="sm" onClick={handleSaveAndNext}>
                  Save & Next
                  <ArrowRight className="w-4 h-4" />
                </ReusableButton>
              ) : (
                <ReusableButton
                  variant="accent"
                  size="sm"
                  onClick={() => setShowConfirmModal(true)}
                >
                  <Flag className="w-4 h-4" />
                  Review & Submit
                </ReusableButton>
              )}
            </div>
          </div>
        </ReusableCard>

        <ReusableCard className="hidden lg:block lg:col-span-4 sticky top-20">
          {renderPaletteContent()}
        </ReusableCard>
      </div>

      {/* Mobile Palette Drawer */}
      {showMobilePalette && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex justify-end lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Question palette"
        >
          <div className="w-full max-w-xs bg-white dark:bg-[#111A2E] h-full p-5 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                Question Palette
              </h2>
              <button
                type="button"
                aria-label="Close palette"
                onClick={() => setShowMobilePalette(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderPaletteContent()}
          </div>
        </div>
      )}

      {/* Syllabus Modal Inside Exam Room */}
      {showSyllabusDrawer && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Exam syllabus"
        >
          <ReusableCard className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                Syllabus — {test.title}
              </h2>
              <button
                type="button"
                aria-label="Close syllabus"
                onClick={() => setShowSyllabusDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {effectiveSyllabus.map((item) => (
                <div
                  key={item.subject}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
                >
                  <p className="text-xs font-bold uppercase text-[#2563EB] dark:text-sky-400">
                    {item.subject}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {item.chapters.join(', ')}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <ReusableButton variant="primary" size="sm" onClick={() => setShowSyllabusDrawer(false)}>
                Return to Question
              </ReusableButton>
            </div>
          </ReusableCard>
        </div>
      )}

      {/* Exam Room-Exit Proctoring Warning Modal */}
      {exitWarningModal.open && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label="Exam room exit warning"
        >
          <ReusableCard className="w-full max-w-md space-y-4 border-2 border-[#F97316]">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-[#F97316] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  Exam Room Integrity Warning #{roomExitWarnings}
                </p>
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white mt-0.5">
                  Do Not Leave the CBT Exam Room
                </h2>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {exitWarningModal.reason}
            </p>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200">
              Total Room-Exit Warnings logged in this session:{' '}
              <strong className="font-mono">{roomExitWarnings}</strong>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              {exitWarningModal.allowForceExit && (
                <ReusableButton
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setExitWarningModal({ open: false, reason: '', allowForceExit: false });
                    onExit();
                  }}
                >
                  Exit Without Submitting
                </ReusableButton>
              )}
              <ReusableButton
                variant="primary"
                size="sm"
                onClick={() =>
                  setExitWarningModal({ open: false, reason: '', allowForceExit: false })
                }
              >
                Return to Exam Room
              </ReusableButton>
            </div>
          </ReusableCard>
        </div>
      )}

      {/* Pre-Submit Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm test submission"
        >
          <ReusableCard className="w-full max-w-md space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  Submit {test.destination === 'cbt-mock' ? 'CBT Mock Test' : 'DPP Practice'}?
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Review your question status before finalizing your official score.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close submission dialog"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-sm">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Answered</p>
                <p className="font-mono text-xl font-bold tabular-nums text-emerald-900 dark:text-emerald-200">
                  {paletteCounts.answered + paletteCounts['answered-marked']}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                <p className="text-xs text-rose-700 dark:text-rose-300">Not Answered</p>
                <p className="font-mono text-xl font-bold tabular-nums text-rose-900 dark:text-rose-200">
                  {paletteCounts['not-answered'] + paletteCounts['not-visited']}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40">
                <p className="text-xs text-violet-700 dark:text-violet-300">Marked for Review</p>
                <p className="font-mono text-xl font-bold tabular-nums text-violet-900 dark:text-violet-200">
                  {paletteCounts['marked-review'] + paletteCounts['answered-marked']}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900">
                <p className="text-xs text-slate-600 dark:text-slate-400">Time Remaining</p>
                <p className="font-mono text-xl font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                  {formatClock(remainingSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <ReusableButton
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                Continue Test
              </ReusableButton>
              <ReusableButton
                variant="accent"
                size="sm"
                disabled={isSubmitting}
                onClick={() => void executeSubmit()}
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Evaluating...' : 'Confirm & Submit'}
              </ReusableButton>
            </div>
          </ReusableCard>
        </div>
      )}
      {/* Enlarged Question Lightbox Modal */}
      <QuestionZoomModal payload={zoomPayload} onClose={() => setZoomPayload(null)} />
    </div>
  );
}
