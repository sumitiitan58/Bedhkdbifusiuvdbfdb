import { useContext, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookMarked,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  GraduationCap,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { ThemeContext } from '../context/ThemeProvider';
import { requestPrepsAiMessages } from '../services/geminiClient';
import {
  buildPrepsAiStudentContext,
  computeExamCountdown,
  computeStudyStreak,
} from '../utils/streakTracker';
import {
  extractMistakeEntries,
  type MistakeNotebookEntry,
} from '../utils/testAnalysisEngine';
import {
  analyzeMistakePatterns,
  buildPersonalizedReattemptSet,
  classifyMistakeRootCause,
  getRootCauseLabel,
  type ReattemptStrategy,
} from '../utils/mistakeAnalysisEngine';
import { computePrepScore } from '../utils/prepScoreEngine';
import { evaluateSingleQuestion } from '../utils/scoringEngine';
import {
  resolveOptionImageSrc,
  resolveQuestionImageSrc,
} from '../utils/questionImageRenderer';
import { cleanTextForSpeech } from '../utils/speechUtils';
import { speakText, stopSpeaking } from '../utils/speakText';
import { playAiSparkle, playClick, playSuccess } from '../utils/soundEffects';
import type { StudentAnswerValue, TestQuestionRecord } from '../types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

function useSimpleIndianTts() {
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const stop = () => {
    stopSpeaking();
    setSpeakingKey(null);
  };

  const toggleSpeak = (key: string, rawText: string) => {
    playClick();
    if (speakingKey === key) {
      stop();
      return;
    }
    const cleaned = cleanTextForSpeech(rawText);
    if (!cleaned) return;
    setSpeakingKey(key);
    void speakText(cleaned, {
      language: 'hinglish',
      onStart: () => setSpeakingKey(key),
      onEnd: () => setSpeakingKey((curr) => (curr === key ? null : curr)),
      onError: () => setSpeakingKey((curr) => (curr === key ? null : curr)),
    });
  };

  return { speakingKey, toggleSpeak, stop };
}

interface ReattemptCardProps {
  question: TestQuestionRecord;
  metaLine: string;
  statusTag: 'wrong' | 'unattempted' | 'vault';
  isResolved: boolean;
  isBookmarked: boolean;
  studentContext: Record<string, unknown>;
  onToggleResolved?: () => void;
  onToggleBookmark: () => void;
}

function InteractiveQuestionVaultCard({
  question,
  metaLine,
  statusTag,
  isResolved,
  isBookmarked,
  studentContext,
  onToggleResolved,
  onToggleBookmark,
}: ReattemptCardProps) {
  const imageTheme = useContext(ThemeContext)?.theme === 'dark' ? 'dark' : 'light';
  const { openLiveTeacher } = usePrepskm2();
  const tts = useSimpleIndianTts();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<number[]>([]);
  const [integerInput, setIntegerInput] = useState('');
  const [checkedResult, setCheckedResult] = useState<'correct' | 'wrong' | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [aiError, setAiError] = useState('');

  const handleCheck = () => {
    playClick();
    let ans: StudentAnswerValue | undefined;
    if (question.questionType === 'integer') {
      ans = { type: 'integer', value: integerInput };
    } else if (question.questionType === 'multi-mcq') {
      ans = { type: 'multi-mcq', selectedIndices: selectedMulti };
    } else {
      ans = { type: 'single-mcq', selectedIndex };
    }
    const res = evaluateSingleQuestion(question, ans, {
      positiveMarks: question.positiveMarks ?? 4,
      negativeMarks: question.negativeMarks ?? 1,
      negativeMarkingEnabled: true,
    });
    if (!res.answered) return;
    setCheckedResult(res.isCorrect ? 'correct' : 'wrong');
    setShowSolution(true);
    if (res.isCorrect) {
      playSuccess();
    }
  };

  const handleReset = () => {
    playClick();
    setSelectedIndex(null);
    setSelectedMulti([]);
    setIntegerInput('');
    setCheckedResult(null);
    setShowSolution(false);
  };

  const officialAnswerText =
    question.questionType === 'integer'
      ? question.numericalAnswer ?? '—'
      : (question.correctOptionIndices ?? [])
          .map((i) => `Option ${OPTION_LETTERS[i]}`)
          .join(', ') || '—';

  const handleAskPrepsAiForQuestion = async () => {
    if (aiLoading) return;
    playClick();
    setAiLoading(true);
    setAiError('');

    const optionLines = (question.optionTexts ?? [])
      .map((opt, idx) => `${OPTION_LETTERS[idx] ?? idx + 1}) ${opt}`)
      .join(' | ');

    const prompt = [
      `Help me fix this ${question.subjectName}${question.chapterName ? ` (${question.chapterName})` : ''} mistake step-by-step.`,
      question.questionText
        ? `Question: ${question.questionText}`
        : `Question #${question.questionNumber} (image-based problem)`,
      optionLines ? `Options: ${optionLines}` : '',
      `Official Answer: ${officialAnswerText}`,
      question.solutionText ? `Reference Solution: ${question.solutionText}` : '',
      'Explain the core concept, step-by-step solving method, and the exact exam trap to avoid next time.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const res = await requestPrepsAiMessages({
        messages: [{ role: 'user', content: prompt }],
        context: {
          ...studentContext,
          mistakeQuestion: {
            subject: question.subjectName,
            chapter: question.chapterName ?? 'Core Syllabus',
            status: statusTag,
            questionType: question.questionType,
            questionText: question.questionText ?? '',
            options: question.optionTexts ?? [],
            officialAnswer: officialAnswerText,
            solutionText: question.solutionText ?? '',
          },
        },
      });
      setAiReply(res.reply);
      playAiSparkle();
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Preps AI could not analyze this question right now. Please try again.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ReusableCard className="space-y-5">
      {/* Top Metadata Strip (Zero Pills — Clean Unboxed Typography) */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-[#2563EB] dark:text-sky-400">{question.subjectName}</span>
            {question.chapterName && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-700 dark:text-slate-200">{question.chapterName}</span>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span
              className={
                isResolved
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : statusTag === 'wrong'
                    ? 'text-rose-600 dark:text-rose-400'
                    : statusTag === 'unattempted'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-[#F97316]'
              }
            >
              {isResolved
                ? 'Mastered'
                : statusTag === 'wrong'
                  ? 'Wrong in Test'
                  : statusTag === 'unattempted'
                    ? 'Unattempted in Test'
                    : 'Saved in Vault'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{metaLine}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleResolved && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onToggleResolved();
              }}
              aria-pressed={isResolved}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                isResolved
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isResolved ? 'Mastered' : 'Mark Mastered'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playClick();
              onToggleBookmark();
            }}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? 'Remove from Important Vault' : 'Save to Important Vault'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isBookmarked
                ? 'bg-[#F97316]/10 border-[#F97316] text-[#F97316]'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#F97316]'
            }`}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-3.5 h-3.5" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
            {isBookmarked ? 'In Vault' : 'Bookmark'}
          </button>
        </div>
      </div>

      {/* Question Prompt in Image Format */}
      <div className="space-y-3">
        {(() => {
          const resolvedQImg = resolveQuestionImageSrc(question, imageTheme);
          return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182D] p-2">
              <img
                src={resolvedQImg.src}
                alt={resolvedQImg.alt}
                className="w-full max-w-[760px] h-auto mx-auto object-contain rounded-lg"
              />
            </div>
          );
        })()}
      </div>

      {/* Interactive Re-Attempt Controls */}
      {question.questionType === 'integer' ? (
        <div className="max-w-xs space-y-2">
          <label
            htmlFor={`reattempt-int-${question.id}`}
            className="block text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Re-Attempt Numerical Value
          </label>
          <input
            id={`reattempt-int-${question.id}`}
            type="text"
            inputMode="decimal"
            value={integerInput}
            onChange={(e) => setIntegerInput(e.target.value)}
            placeholder="Enter answer..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-base font-bold"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTION_LETTERS.map((letter, idx) => {
            const isSelected =
              question.questionType === 'multi-mcq'
                ? selectedMulti.includes(idx)
                : selectedIndex === idx;
            const isCorrectOpt = (question.correctOptionIndices ?? []).includes(idx);

            const visualState =
              showSolution && isCorrectOpt
                ? 'correct'
                : checkedResult === 'wrong' && isSelected && !isCorrectOpt
                  ? 'wrong'
                  : isSelected
                    ? 'selected'
                    : 'default';

            const resolvedOpt = resolveOptionImageSrc(question, idx, {
              theme: imageTheme,
              state: visualState,
            });

            return (
              <button
                key={letter}
                type="button"
                aria-pressed={isSelected}
                aria-label={resolvedOpt.alt}
                onClick={() => {
                  playClick();
                  if (question.questionType === 'multi-mcq') {
                    setSelectedMulti((prev) =>
                      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                    );
                  } else {
                    setSelectedIndex(idx);
                  }
                }}
                className={`w-full text-left rounded-xl transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                  resolvedOpt.isCustomImage
                    ? `p-2.5 border flex items-center gap-3 ${
                        visualState === 'correct'
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                          : visualState === 'wrong'
                            ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40'
                            : isSelected
                              ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-[#2563EB]'
                      }`
                    : `${isSelected && !showSolution ? 'ring-2 ring-[#2563EB]' : ''}`
                }`}
              >
                {resolvedOpt.isCustomImage && (
                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {letter}
                  </span>
                )}
                <img
                  src={resolvedOpt.src}
                  alt={resolvedOpt.alt}
                  className={
                    resolvedOpt.isCustomImage
                      ? 'max-h-24 w-auto object-contain rounded-lg bg-white'
                      : 'w-full h-auto object-contain rounded-xl block'
                  }
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <ReusableButton variant="primary" size="sm" onClick={handleCheck}>
            Check Re-Attempt
          </ReusableButton>
          <ReusableButton
            variant="secondary"
            size="sm"
            onClick={() => {
              playClick();
              setShowSolution((s) => !s);
            }}
          >
            <Eye className="w-4 h-4" />
            {showSolution ? 'Hide Solution' : 'Reveal Solution'}
          </ReusableButton>
          <ReusableButton
            variant="secondary"
            size="sm"
            disabled={aiLoading}
            onClick={() => void handleAskPrepsAiForQuestion()}
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
            )}
            {aiLoading ? 'Analyzing...' : aiReply ? 'Refresh AI Fix' : 'Ask Preps AI'}
          </ReusableButton>
          <button
            type="button"
            onClick={() => {
              playClick();
              openLiveTeacher({
                questionText:
                  question.questionText ||
                  `Question ${question.questionNumber} (${question.subjectName}${question.chapterName ? ` — ${question.chapterName}` : ''})`,
                subjectName: question.subjectName,
                chapterName: question.chapterName,
                solutionText: question.solutionText,
                officialAnswer: officialAnswerText,
                source: 'mistake-notebook',
              });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#00B4FF] to-[#1D56C6] text-[#070A12] shadow-[0_0_18px_rgba(0,180,255,0.42)] hover:brightness-110 transition-all"
          >
            <GraduationCap className="w-4 h-4" />
            Explain Like a Teacher
          </button>
          {checkedResult && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#2563EB]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try Again
            </button>
          )}
        </div>

        {checkedResult && (
          <div
            className={`inline-flex items-center gap-1.5 text-sm font-bold ${
              checkedResult === 'correct'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {checkedResult === 'correct' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Nailed it! Correct answer.
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Incorrect — Official Answer: {officialAnswerText}
              </>
            )}
          </div>
        )}
      </div>

      {/* Solution Box */}
      {showSolution && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-sm">
          <p className="font-bold text-[#0B1B3B] dark:text-white">
            Official Answer:{' '}
            <span className="font-mono text-emerald-700 dark:text-emerald-400">
              {officialAnswerText}
            </span>
          </p>
          {question.solutionImageUrl && (
            <img
              src={question.solutionImageUrl}
              alt="Official solution"
              className="max-h-72 rounded-lg bg-white p-2 border border-slate-200"
            />
          )}
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
            {question.solutionText || 'Review the highlighted option and chapter concept notes.'}
          </p>
        </div>
      )}

      {/* Preps AI Step-by-Step Mistake Fix */}
      {(aiReply || aiError) && (
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/35 border border-blue-200/80 dark:border-blue-800/70 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Preps AI Step-by-Step Mistake Fix
            </p>
            <div className="flex items-center gap-1.5">
              {aiReply && !aiError && (
                <button
                  type="button"
                  onClick={() => tts.toggleSpeak(`card-${question.id}`, aiReply)}
                  aria-label={
                    tts.speakingKey === `card-${question.id}`
                      ? 'Stop reading AI fix'
                      : 'Listen to AI fix'
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-blue-200 dark:border-blue-700 bg-white/80 dark:bg-slate-900/70 text-[#2563EB] dark:text-sky-300"
                >
                  {tts.speakingKey === `card-${question.id}` ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                  {tts.speakingKey === `card-${question.id}` ? 'Stop' : 'Listen'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  tts.stop();
                  setAiReply('');
                  setAiError('');
                }}
                aria-label="Close Preps AI explanation"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {aiError ? (
            <p className="text-rose-700 dark:text-rose-300">{aiError}</p>
          ) : (
            <p className="text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
              {aiReply}
            </p>
          )}
        </div>
      )}
    </ReusableCard>
  );
}

interface PersonalizedReattemptDrillProps {
  entries: MistakeNotebookEntry[];
  setLabel: string;
  resolvedSet: Set<string>;
  studentContext: Record<string, unknown>;
  onMarkResolved: (questionId: string) => void;
  onExit: () => void;
}

function PersonalizedReattemptDrill({
  entries,
  setLabel,
  resolvedSet,
  studentContext,
  onMarkResolved,
  onExit,
}: PersonalizedReattemptDrillProps) {
  const imageTheme = useContext(ThemeContext)?.theme === 'dark' ? 'dark' : 'light';
  const tts = useSimpleIndianTts();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answersById, setAnswersById] = useState<Record<string, StudentAnswerValue>>({});
  const [resultsById, setResultsById] = useState<Record<string, 'correct' | 'wrong'>>({});
  const [aiExplainById, setAiExplainById] = useState<Record<string, string>>({});
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  const currentEntry = entries[currentIdx];
  const question = currentEntry?.question;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const correctCount = Object.values(resultsById).filter((r) => r === 'correct').length;
  const wrongCount = Object.values(resultsById).filter((r) => r === 'wrong').length;
  const checkedCount = correctCount + wrongCount;

  if (!currentEntry || !question) {
    return null;
  }

  const currentAns = answersById[question.id];
  const currentResult = resultsById[question.id] ?? null;
  const officialAnswerText =
    question.questionType === 'integer'
      ? question.numericalAnswer ?? '—'
      : (question.correctOptionIndices ?? [])
          .map((i) => `Option ${OPTION_LETTERS[i]}`)
          .join(', ') || '—';

  const handleCheckCurrent = () => {
    if (!currentAns) return;
    playClick();
    const res = evaluateSingleQuestion(question, currentAns, {
      positiveMarks: question.positiveMarks ?? 4,
      negativeMarks: question.negativeMarks ?? 1,
      negativeMarkingEnabled: true,
    });
    if (!res.answered) return;
    const outcome = res.isCorrect ? 'correct' : 'wrong';
    setResultsById((prev) => ({ ...prev, [question.id]: outcome }));
    if (res.isCorrect) {
      playSuccess();
      if (!resolvedSet.has(question.id)) {
        onMarkResolved(question.id);
      }
    }
  };

  const handleExplainWithAi = async () => {
    if (aiBusyId) return;
    playClick();
    setAiBusyId(question.id);
    try {
      const prompt = [
        `I am re-attempting this ${question.subjectName} (${question.chapterName || 'Core'}) question in my Personalized Re-Attempt Set.`,
        question.questionText ? `Question: ${question.questionText}` : '',
        `Official Answer: ${officialAnswerText}`,
        question.solutionText ? `Reference Solution: ${question.solutionText}` : '',
        'Give a crisp 3-step explanation and the exact conceptual trap to remember.',
      ]
        .filter(Boolean)
        .join('\n');
      const res = await requestPrepsAiMessages({
        messages: [{ role: 'user', content: prompt }],
        context: studentContext,
      });
      setAiExplainById((prev) => ({ ...prev, [question.id]: res.reply }));
      playAiSparkle();
    } catch (err) {
      setAiExplainById((prev) => ({
        ...prev,
        [question.id]:
          err instanceof Error ? err.message : 'Unable to fetch Preps AI explanation right now.',
      }));
    } finally {
      setAiBusyId(null);
    }
  };

  if (finished) {
    const accuracy =
      checkedCount > 0 ? Math.round((correctCount / checkedCount) * 100) : 0;
    return (
      <ReusableCard className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Re-Attempt Set Complete · {setLabel}
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
              Recovery Scorecard
            </h2>
          </div>
          <ReusableButton variant="secondary" size="sm" onClick={onExit}>
            Back to Mistake Notebook
          </ReusableButton>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs text-slate-500">Correct / Mastered</p>
            <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {correctCount}/{entries.length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs text-slate-500">Still Needs Work</p>
            <p className="mt-1 font-mono text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {wrongCount}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs text-slate-500">Drill Accuracy</p>
            <p className="mt-1 font-mono text-2xl font-extrabold text-[#2563EB] dark:text-sky-400">
              {accuracy}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs text-slate-500">Total Time</p>
            <p className="mt-1 font-mono text-2xl font-extrabold text-[#0B1B3B] dark:text-white">
              {formatTimer(elapsedSeconds)}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Every question you answered correctly in this personalized drill has been marked{' '}
          <strong className="text-emerald-600 dark:text-emerald-400">Mastered</strong> to boost your
          Prep Score recovery factor automatically.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <ReusableButton
            variant="primary"
            size="sm"
            onClick={() => {
              setCurrentIdx(0);
              setElapsedSeconds(0);
              setAnswersById({});
              setResultsById({});
              setFinished(false);
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Re-Run This Set
          </ReusableButton>
          <ReusableButton variant="secondary" size="sm" onClick={onExit}>
            Return to Mistake List
          </ReusableButton>
        </div>
      </ReusableCard>
    );
  }

  const rootCauseLabel = getRootCauseLabel(classifyMistakeRootCause(currentEntry));

  return (
    <ReusableCard className="space-y-5">
      {/* Drill Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#2563EB] dark:text-sky-400">
            Personalized Re-Attempt Set · {setLabel}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-mono font-bold text-[#0B1B3B] dark:text-white">
              Q {currentIdx + 1} of {entries.length}
            </span>
            <span>·</span>
            <span>{currentEntry.subjectName}</span>
            <span>·</span>
            <span>{currentEntry.chapterName}</span>
            <span>·</span>
            <span className="text-[#F97316] font-semibold">{rootCauseLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            {formatTimer(elapsedSeconds)}
          </span>
          <button
            type="button"
            onClick={() => {
              playClick();
              setFinished(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B1B3B] dark:bg-[#2563EB] text-white hover:opacity-95"
          >
            Finish Set
          </button>
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit re-attempt set"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Navigator Dots */}
      <div className="flex flex-wrap gap-1.5">
        {entries.map((e, idx) => {
          const r = resultsById[e.questionId];
          const active = idx === currentIdx;
          return (
            <button
              key={e.questionId}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-lg font-mono text-xs font-bold border transition-colors ${
                active
                  ? 'border-[#2563EB] bg-[#2563EB] text-white'
                  : r === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : r === 'wrong'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question Prompt in Image Format */}
      <div className="space-y-3">
        {(() => {
          const resolvedQImg = resolveQuestionImageSrc(question, imageTheme);
          return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182D] p-2">
              <img
                src={resolvedQImg.src}
                alt={resolvedQImg.alt}
                className="w-full max-w-[760px] h-auto mx-auto object-contain rounded-lg"
              />
            </div>
          );
        })()}
      </div>

      {/* Answer Input */}
      {question.questionType === 'integer' ? (
        <div className="max-w-xs space-y-1.5">
          <label
            htmlFor="drill-integer-input"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Enter Numerical Value
          </label>
          <input
            id="drill-integer-input"
            type="text"
            inputMode="decimal"
            value={currentAns?.type === 'integer' ? currentAns.value : ''}
            onChange={(e) =>
              setAnswersById((prev) => ({
                ...prev,
                [question.id]: { type: 'integer', value: e.target.value },
              }))
            }
            placeholder="Type answer..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-base font-bold"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTION_LETTERS.map((letter, idx) => {
            const isSelected =
              question.questionType === 'multi-mcq'
                ? currentAns?.type === 'multi-mcq' && currentAns.selectedIndices.includes(idx)
                : currentAns?.type === 'single-mcq' && currentAns.selectedIndex === idx;
            const isCorrectOpt = (question.correctOptionIndices ?? []).includes(idx);

            const visualState =
              currentResult && isCorrectOpt
                ? 'correct'
                : currentResult === 'wrong' && isSelected && !isCorrectOpt
                  ? 'wrong'
                  : isSelected
                    ? 'selected'
                    : 'default';

            const resolvedOpt = resolveOptionImageSrc(question, idx, {
              theme: imageTheme,
              state: visualState,
            });

            return (
              <button
                key={letter}
                type="button"
                aria-pressed={isSelected}
                aria-label={resolvedOpt.alt}
                onClick={() => {
                  playClick();
                  if (question.questionType === 'multi-mcq') {
                    const prevIndices =
                      currentAns?.type === 'multi-mcq' ? currentAns.selectedIndices : [];
                    const next = prevIndices.includes(idx)
                      ? prevIndices.filter((i) => i !== idx)
                      : [...prevIndices, idx];
                    setAnswersById((prev) => ({
                      ...prev,
                      [question.id]: { type: 'multi-mcq', selectedIndices: next },
                    }));
                  } else {
                    setAnswersById((prev) => ({
                      ...prev,
                      [question.id]: { type: 'single-mcq', selectedIndex: idx },
                    }));
                  }
                }}
                className={`w-full text-left rounded-xl transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                  resolvedOpt.isCustomImage
                    ? `p-2.5 border flex items-center gap-3 ${
                        visualState === 'correct'
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                          : visualState === 'wrong'
                            ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40'
                            : isSelected
                              ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-[#2563EB]'
                      }`
                    : `${isSelected && !currentResult ? 'ring-2 ring-[#2563EB]' : ''}`
                }`}
              >
                {resolvedOpt.isCustomImage && (
                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {letter}
                  </span>
                )}
                <img
                  src={resolvedOpt.src}
                  alt={resolvedOpt.alt}
                  className={
                    resolvedOpt.isCustomImage
                      ? 'max-h-24 w-auto object-contain rounded-lg bg-white'
                      : 'w-full h-auto object-contain rounded-xl block'
                  }
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Check + Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <ReusableButton
            variant="primary"
            size="sm"
            disabled={!currentAns}
            onClick={handleCheckCurrent}
          >
            Check Answer
          </ReusableButton>
          <ReusableButton
            variant="secondary"
            size="sm"
            disabled={aiBusyId === question.id}
            onClick={() => void handleExplainWithAi()}
          >
            {aiBusyId === question.id ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
            )}
            AI Hint &amp; Fix
          </ReusableButton>
        </div>

        <div className="flex items-center gap-2">
          <ReusableButton
            variant="secondary"
            size="sm"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Prev
          </ReusableButton>
          {currentIdx < entries.length - 1 ? (
            <ReusableButton
              variant="primary"
              size="sm"
              onClick={() => setCurrentIdx((i) => Math.min(entries.length - 1, i + 1))}
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </ReusableButton>
          ) : (
            <ReusableButton
              variant="accent"
              size="sm"
              onClick={() => {
                playSuccess();
                setFinished(true);
              }}
            >
              View Scorecard
            </ReusableButton>
          )}
        </div>
      </div>

      {/* Feedback + Solution */}
      {currentResult && (
        <div
          className={`p-4 rounded-xl border text-sm space-y-1.5 ${
            currentResult === 'correct'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50/70 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800'
          }`}
        >
          <p className="font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
            {currentResult === 'correct' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Correct — Marked Mastered!
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                Incorrect — Official Answer: {officialAnswerText}
              </>
            )}
          </p>
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
            {question.solutionText || 'Review the highlighted option and key chapter concept.'}
          </p>
        </div>
      )}

      {aiExplainById[question.id] && (
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800 text-sm space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Preps AI Diagnosis
            </p>
            <button
              type="button"
              onClick={() => tts.toggleSpeak(`drill-${question.id}`, aiExplainById[question.id])}
              aria-label={
                tts.speakingKey === `drill-${question.id}`
                  ? 'Stop reading diagnosis'
                  : 'Listen to diagnosis'
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-blue-200 dark:border-blue-700 bg-white/80 dark:bg-slate-900/70 text-[#2563EB] dark:text-sky-300"
            >
              {tts.speakingKey === `drill-${question.id}` ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
              {tts.speakingKey === `drill-${question.id}` ? 'Stop' : 'Listen'}
            </button>
          </div>
          <p className="text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
            {aiExplainById[question.id]}
          </p>
        </div>
      )}
    </ReusableCard>
  );
}

export default function MistakeNotebookPage() {
  const { profile, firebaseUser, cohortId } = useAuth();
  const {
    allCohorts,
    attempts,
    chapters,
    questions,
    activeStudyDates,
    targetExamDate,
    bookmarkedQuestionIds,
    resolvedMistakeIds,
    toggleQuestionBookmark,
    toggleMistakeResolved,
  } = usePlatformData();

  const batchTts = useSimpleIndianTts();
  const [activeTab, setActiveTab] = useState<'mistakes' | 'vault'>('mistakes');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'wrong' | 'unattempted' | 'resolved'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [batchAiLoading, setBatchAiLoading] = useState(false);
  const [batchAiReply, setBatchAiReply] = useState('');
  const [batchAiError, setBatchAiError] = useState('');

  // Personalized Re-Attempt Set configuration & active session
  const [reattemptSize, setReattemptSize] = useState<number>(5);
  const [reattemptStrategy, setReattemptStrategy] = useState<ReattemptStrategy>('high-risk');
  const [activeDrill, setActiveDrill] = useState<{
    entries: MistakeNotebookEntry[];
    label: string;
  } | null>(null);

  const resolvedSet = useMemo(() => new Set(resolvedMistakeIds), [resolvedMistakeIds]);
  const bookmarkSet = useMemo(() => new Set(bookmarkedQuestionIds), [bookmarkedQuestionIds]);

  const allMistakes = useMemo(
    () => extractMistakeEntries(attempts, questions),
    [attempts, questions]
  );

  const patternAnalysis = useMemo(
    () => analyzeMistakePatterns(allMistakes, resolvedSet),
    [allMistakes, resolvedSet]
  );

  const cohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'Class 12 JEE',
    [allCohorts, cohortId]
  );

  const prepScore = useMemo(
    () =>
      computePrepScore({
        attempts,
        questions,
        chapters,
        activeStudyDates,
        resolvedMistakeIds,
        cohortLabel,
      }),
    [attempts, questions, chapters, activeStudyDates, resolvedMistakeIds, cohortLabel]
  );

  const studentContext = useMemo(() => {
    const streak = computeStudyStreak(activeStudyDates);
    const countdown = computeExamCountdown(targetExamDate);
    const unresolvedMistakesCount = allMistakes.filter((m) => !resolvedSet.has(m.questionId)).length;

    return {
      ...buildPrepsAiStudentContext({
        studentName: profile?.displayName || firebaseUser?.displayName || 'Student',
        cohortLabel,
        attempts,
        currentStreakDays: streak.currentStreak,
        targetExamDaysLeft: countdown.daysRemaining,
        bookmarkedQuestionsCount: bookmarkedQuestionIds.length,
        unresolvedMistakesCount,
      }),
      prepScore: `${prepScore.score}/100 (${prepScore.tier})`,
    };
  }, [
    activeStudyDates,
    allMistakes,
    attempts,
    bookmarkedQuestionIds.length,
    cohortLabel,
    firebaseUser?.displayName,
    prepScore.score,
    prepScore.tier,
    profile?.displayName,
    resolvedSet,
    targetExamDate,
  ]);

  const vaultedQuestions = useMemo(() => {
    const qMap = new Map(questions.map((q) => [q.id, q]));
    return bookmarkedQuestionIds
      .map((id) => qMap.get(id))
      .filter((q): q is TestQuestionRecord => Boolean(q));
  }, [bookmarkedQuestionIds, questions]);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    allMistakes.forEach((m) => set.add(m.subjectName));
    vaultedQuestions.forEach((q) => set.add(q.subjectName));
    return Array.from(set).sort();
  }, [allMistakes, vaultedQuestions]);

  const filteredMistakes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMistakes.filter((m) => {
      if (subjectFilter !== 'all' && m.subjectName !== subjectFilter) return false;
      const isResolved = resolvedSet.has(m.questionId);
      if (statusFilter === 'resolved' && !isResolved) return false;
      if (statusFilter === 'wrong' && (m.status !== 'wrong' || isResolved)) return false;
      if (statusFilter === 'unattempted' && (m.status !== 'unattempted' || isResolved)) return false;
      if (q) {
        return (
          m.chapterName.toLowerCase().includes(q) ||
          m.subjectName.toLowerCase().includes(q) ||
          (m.question.questionText ?? '').toLowerCase().includes(q) ||
          m.testTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allMistakes, resolvedSet, searchQuery, statusFilter, subjectFilter]);

  const filteredVault = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vaultedQuestions.filter((item) => {
      if (subjectFilter !== 'all' && item.subjectName !== subjectFilter) return false;
      if (q) {
        return (
          (item.chapterName ?? '').toLowerCase().includes(q) ||
          item.subjectName.toLowerCase().includes(q) ||
          (item.questionText ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, subjectFilter, vaultedQuestions]);

  const activeMistakesCount = patternAnalysis.totalActive;
  const masteredCount = patternAnalysis.totalMastered;

  const handleLaunchReattemptSet = (useSampleFallback = false) => {
    playClick();
    if (allMistakes.length > 0 && !useSampleFallback) {
      const selected = buildPersonalizedReattemptSet(allMistakes, resolvedSet, {
        size: reattemptSize >= 999 ? allMistakes.length : reattemptSize,
        strategy: reattemptStrategy,
        subjectFilter,
      });
      if (selected.length === 0) return;
      const strategyLabel =
        reattemptStrategy === 'high-risk'
          ? 'High-Risk Priority'
          : reattemptStrategy === 'weak-chapter'
            ? 'Weakest Chapter Focus'
            : subjectFilter !== 'all'
              ? `${subjectFilter} Focus`
              : 'Subject Focus';
      setActiveDrill({ entries: selected, label: `${strategyLabel} (${selected.length} Qs)` });
      return;
    }

    // Starter practice re-attempt set when user has 0 logged mock mistakes yet
    const nowIso = new Date().toISOString();
    const sampleEntries: MistakeNotebookEntry[] = questions.slice(0, Math.min(5, questions.length)).map((q) => ({
      questionId: q.id,
      question: q,
      latestAttemptId: 'starter-diagnostic',
      testId: q.testId,
      subjectName: q.subjectName,
      chapterName: q.chapterName || 'Core Syllabus',
      testTitle: 'Starter Diagnostic Set',
      status: 'wrong',
      timeSpentSeconds: 45,
      submittedAtIso: nowIso,
      studentAnswer: undefined,
      occurrences: 1,
    }));
    if (sampleEntries.length > 0) {
      setActiveDrill({
        entries: sampleEntries,
        label: `Starter Practice Re-Attempt (${sampleEntries.length} Qs)`,
      });
    }
  };

  const handleRunAiErrorDiagnosis = async () => {
    if (batchAiLoading) return;
    playClick();
    setBatchAiLoading(true);
    setBatchAiError('');

    const activeSample = allMistakes
      .filter((m) => !resolvedSet.has(m.questionId))
      .slice(0, 6)
      .map((m) => ({
        subject: m.subjectName,
        chapter: m.chapterName,
        status: m.status,
        rootCause: getRootCauseLabel(classifyMistakeRootCause(m)),
        occurrences: m.occurrences,
        timeSpentSeconds: m.timeSpentSeconds,
        questionSnippet: (m.question.questionText ?? '').slice(0, 160),
      }));

    const prompt =
      activeSample.length > 0
        ? `Perform a structured AI Error Analysis on my ${activeMistakesCount} active mistakes. Dominant pattern: ${patternAnalysis.dominantCauseLabel}. Breakdown: ${patternAnalysis.conceptualGapCount} conceptual gaps, ${patternAnalysis.rushedSlipCount} rushed slips (<15s), ${patternAnalysis.timeSinkCount} overtime traps (>150s), ${patternAnalysis.skippedTopicCount} skipped. Top leak chapters: ${patternAnalysis.topLeakChapters.map((c) => `${c.chapterName} (${c.count})`).join(', ')}. Give me: (1) Root-cause diagnosis, (2) 3 concrete exam-day rules to cut negative marks, and (3) The exact order to run my Personalized Re-Attempt Set.`
        : 'I have not logged CBT mock mistakes yet. Give me a concise 3-part JEE/NEET error-prevention framework covering conceptual checks, avoiding <15s silly slips, and escaping >150s time traps.';

    try {
      const res = await requestPrepsAiMessages({
        messages: [{ role: 'user', content: prompt }],
        context: {
          ...studentContext,
          mistakeSummary: {
            pendingMistakes: activeMistakesCount,
            masteredMistakes: masteredCount,
            bookmarkedCount: vaultedQuestions.length,
            dominantCause: patternAnalysis.dominantCauseLabel,
            rootCauseCounts: {
              conceptualGaps: patternAnalysis.conceptualGapCount,
              rushedSlips: patternAnalysis.rushedSlipCount,
              timeSinks: patternAnalysis.timeSinkCount,
              skippedTopics: patternAnalysis.skippedTopicCount,
            },
            topLeakChapters: patternAnalysis.topLeakChapters,
            topPendingMistakes: activeSample,
          },
        },
      });
      setBatchAiReply(res.reply);
      playAiSparkle();
    } catch (err) {
      setBatchAiError(
        err instanceof Error
          ? err.message
          : 'Preps AI could not analyze your mistake patterns right now. Please try again.'
      );
    } finally {
      setBatchAiLoading(false);
    }
  };

  return (
    <PageLayout>
      <SeoHead
        title="Mistake Notebook & AI Error Analysis | PREPSKM.IN"
        description="Analyze root-cause error patterns, run personalized re-attempt sets, and get step-by-step Preps AI mistake fixes on PREPSKM.IN."
        canonicalPath="/mistakes"
        noIndex
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              AI Error Analysis &amp; Personalized Re-Attempt Engine
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
              Mistake Notebook
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Diagnose conceptual gaps vs. rushed slips and master your highest-risk mistakes through targeted re-attempt sets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <ReusableButton
              variant="secondary"
              size="sm"
              disabled={batchAiLoading}
              onClick={() => void handleRunAiErrorDiagnosis()}
            >
              {batchAiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
              ) : (
                <Brain className="w-4 h-4 text-[#2563EB]" />
              )}
              {batchAiLoading ? 'Diagnosing Errors...' : 'Run AI Error Diagnosis'}
            </ReusableButton>
            <ReusableButton variant="primary" size="sm" to="/cbt-mocks">
              <ClipboardCheck className="w-4 h-4" />
              Take CBT Mock
            </ReusableButton>
          </div>
        </div>

        {/* Active Inline Personalized Re-Attempt Drill */}
        {activeDrill && (
          <PersonalizedReattemptDrill
            entries={activeDrill.entries}
            setLabel={activeDrill.label}
            resolvedSet={resolvedSet}
            studentContext={studentContext as unknown as Record<string, unknown>}
            onMarkResolved={(qid) => toggleMistakeResolved(qid)}
            onExit={() => setActiveDrill(null)}
          />
        )}

        {/* AI Diagnosis Response Box */}
        {(batchAiReply || batchAiError) && (
          <ReusableCard className="bg-blue-50/70 dark:bg-blue-950/35 border-blue-200/90 dark:border-blue-800/80 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  Preps AI Error Pattern Diagnosis
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {batchAiReply && !batchAiError && (
                  <button
                    type="button"
                    onClick={() => batchTts.toggleSpeak('batch-diagnosis', batchAiReply)}
                    aria-label={
                      batchTts.speakingKey === 'batch-diagnosis'
                        ? 'Stop reading error diagnosis'
                        : 'Listen to error diagnosis'
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-700 bg-white/80 dark:bg-slate-900/70 text-[#2563EB] dark:text-sky-300"
                  >
                    {batchTts.speakingKey === 'batch-diagnosis' ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    {batchTts.speakingKey === 'batch-diagnosis' ? 'Stop' : 'Listen'}
                  </button>
                )}
                <ReusableButton variant="ghost" size="sm" to="/preps-ai">
                  Open Preps AI
                </ReusableButton>
                <button
                  type="button"
                  onClick={() => {
                    batchTts.stop();
                    setBatchAiReply('');
                    setBatchAiError('');
                  }}
                  aria-label="Dismiss AI diagnosis"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white/60 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {batchAiError ? (
              <p className="text-sm text-rose-700 dark:text-rose-300">{batchAiError}</p>
            ) : (
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                {batchAiReply}
              </p>
            )}
          </ReusableCard>
        )}

        {/* Two-Column Intelligence Row: Root-Cause Analysis + Personalized Re-Attempt Set Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Root-Cause Error Pattern Analysis */}
          <ReusableCard className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Root-Cause Error Analysis
                </p>
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  {patternAnalysis.dominantCauseLabel}
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {activeMistakesCount} Pending · {masteredCount} Mastered · {vaultedQuestions.length}{' '}
                Vaulted
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {patternAnalysis.dominantCauseAdvice}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-500">Conceptual Gaps</p>
                <p className="mt-1 font-mono text-xl font-extrabold text-[#0B1B3B] dark:text-white">
                  {patternAnalysis.conceptualGapCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  Rushed (&lt;15s)
                </p>
                <p className="mt-1 font-mono text-xl font-extrabold text-rose-600 dark:text-rose-400">
                  {patternAnalysis.rushedSlipCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-[#F97316]">Time-Sinks (&gt;150s)</p>
                <p className="mt-1 font-mono text-xl font-extrabold text-[#F97316]">
                  {patternAnalysis.timeSinkCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Skipped Topics
                </p>
                <p className="mt-1 font-mono text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  {patternAnalysis.skippedTopicCount}
                </p>
              </div>
            </div>

            {patternAnalysis.topLeakChapters.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Highest Mark-Leak Chapters
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs tabular-nums">
                  {patternAnalysis.topLeakChapters.slice(0, 4).map((ch) => (
                    <span
                      key={`${ch.subjectName}-${ch.chapterName}`}
                      className="text-slate-700 dark:text-slate-300"
                    >
                      <strong className="text-[#0B1B3B] dark:text-white">{ch.chapterName}</strong>{' '}
                      <span className="text-slate-400">({ch.subjectName})</span> ·{' '}
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {ch.count}Q
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ReusableCard>

          {/* Personalized Re-Attempt Set Builder */}
          <ReusableCard className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#F97316] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Personalized Re-Attempt Set
                </p>
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  Build a Timed Recovery Drill
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Auto-prioritizes unresolved errors, tracks speed, and marks solved questions Mastered.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reattempt-strategy"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Prioritization
                  </label>
                  <select
                    id="reattempt-strategy"
                    value={reattemptStrategy}
                    onChange={(e) => setReattemptStrategy(e.target.value as ReattemptStrategy)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="high-risk">High-Risk First</option>
                    <option value="weak-chapter">Weakest Chapters</option>
                    <option value="subject">Active Subject Filter</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reattempt-size"
                    className="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Set Size
                  </label>
                  <select
                    id="reattempt-size"
                    value={reattemptSize}
                    onChange={(e) => setReattemptSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value={5}>5 Questions (Quick)</option>
                    <option value={10}>10 Questions (Focused)</option>
                    <option value={999}>All Pending Mistakes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {allMistakes.length > 0 ? (
                <ReusableButton
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleLaunchReattemptSet(false)}
                >
                  <Play className="w-3.5 h-3.5" />
                  Start Personalized Set
                </ReusableButton>
              ) : (
                <ReusableButton
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  disabled={questions.length === 0}
                  onClick={() => handleLaunchReattemptSet(true)}
                >
                  <Play className="w-3.5 h-3.5" />
                  Try 5-Q Sample Re-Attempt Set
                </ReusableButton>
              )}
            </div>
          </ReusableCard>
        </div>

        {/* Mode Switcher + Filters */}
        <ReusableCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div role="tablist" aria-label="Mistake notebook views" className="flex flex-wrap gap-2">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'mistakes'}
                onClick={() => {
                  playClick();
                  setActiveTab('mistakes');
                }}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === 'mistakes'
                    ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                Auto Mistake Notebook ({allMistakes.length})
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'vault'}
                onClick={() => {
                  playClick();
                  setActiveTab('vault');
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === 'vault'
                    ? 'bg-[#F97316] text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Important Question Vault ({vaultedQuestions.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by chapter, subject, or question keyword..."
                aria-label="Search mistake notebook"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                aria-label="Filter by subject"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {activeTab === 'mistakes' && (
              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'wrong' | 'unattempted' | 'resolved')
                  }
                  aria-label="Filter by mistake status"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="wrong">Wrong Only</option>
                  <option value="unattempted">Unattempted Only</option>
                  <option value="resolved">Mastered Only</option>
                </select>
              </div>
            )}
          </div>
        </ReusableCard>

        {/* List View */}
        {activeTab === 'mistakes' ? (
          filteredMistakes.length === 0 ? (
            <ReusableCard className="py-14 text-center space-y-4">
              <BookMarked className="w-11 h-11 text-slate-400 mx-auto" />
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white">
                  {allMistakes.length === 0
                    ? 'Your Auto Mistake Notebook Is Ready'
                    : 'No Mistakes Match This Filter'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {allMistakes.length === 0
                    ? 'Submit any CBT Mock Test or inline Chapter DPP and every wrong or skipped question will automatically appear here for AI root-cause diagnosis and personalized re-attempt sets.'
                    : 'Clear your subject or status filter to see all logged mistakes.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <ReusableButton variant="accent" to="/cbt-mocks">
                  <ClipboardCheck className="w-4 h-4" />
                  Attempt a CBT Mock Test
                </ReusableButton>
                {questions.length > 0 && allMistakes.length === 0 && (
                  <ReusableButton
                    variant="secondary"
                    onClick={() => handleLaunchReattemptSet(true)}
                  >
                    <Play className="w-4 h-4" />
                    Try Sample Re-Attempt Set
                  </ReusableButton>
                )}
              </div>
            </ReusableCard>
          ) : (
            <div className="space-y-6">
              {filteredMistakes.map((entry) => (
                <InteractiveQuestionVaultCard
                  key={entry.questionId}
                  question={entry.question}
                  metaLine={`From ${entry.testTitle} · ${getRootCauseLabel(classifyMistakeRootCause(entry))} · Spent ${entry.timeSpentSeconds}s · Logged ${entry.occurrences}×`}
                  statusTag={entry.status}
                  isResolved={resolvedSet.has(entry.questionId)}
                  isBookmarked={bookmarkSet.has(entry.questionId)}
                  studentContext={studentContext as unknown as Record<string, unknown>}
                  onToggleResolved={() => toggleMistakeResolved(entry.questionId)}
                  onToggleBookmark={() => toggleQuestionBookmark(entry.questionId)}
                />
              ))}
            </div>
          )
        ) : filteredVault.length === 0 ? (
          <ReusableCard className="py-14 text-center space-y-4">
            <Bookmark className="w-11 h-11 text-[#F97316] mx-auto" />
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white">
                Your Important Question Vault Is Empty
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Click the <strong>Bookmark</strong> button on any tricky question during Test Analysis
                or Solution Review to build your personal last-minute revision vault.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ReusableButton variant="primary" to="/analytics">
                Review Test Solutions
              </ReusableButton>
              {questions.length > 0 && (
                <ReusableButton
                  variant="secondary"
                  onClick={() => {
                    playClick();
                    toggleQuestionBookmark(questions[0].id);
                  }}
                >
                  Bookmark Sample Question to Try Vault
                </ReusableButton>
              )}
            </div>
          </ReusableCard>
        ) : (
          <div className="space-y-6">
            {filteredVault.map((q) => (
              <InteractiveQuestionVaultCard
                key={q.id}
                question={q}
                metaLine={`Question #${q.questionNumber} · ${q.questionType.toUpperCase()} · Saved in Vault`}
                statusTag="vault"
                isResolved={resolvedSet.has(q.id)}
                isBookmarked={bookmarkSet.has(q.id)}
                studentContext={studentContext as unknown as Record<string, unknown>}
                onToggleBookmark={() => toggleQuestionBookmark(q.id)}
              />
            ))}
          </div>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
