import { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer as RechartsContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  StudentAnswerValue,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../../types';
import {
  requestGeminiQuestionExplanation,
  type GeminiQuestionExplanation,
} from '../../services/geminiClient';
import { playAiSparkle, playClick } from '../../utils/soundEffects';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

interface AttemptReviewModalProps {
  attempt: TestAttemptRecord;
  questions: TestQuestionRecord[];
  onClose: () => void;
}

function formatStudentAnswer(
  q: TestQuestionRecord,
  ans: StudentAnswerValue | undefined
): string {
  if (!ans) return 'Unattempted';
  if (q.questionType === 'integer' && ans.type === 'integer') {
    return ans.value.trim() || 'Unattempted';
  }
  if (ans.type === 'single-mcq') {
    return ans.selectedIndex !== null ? `Option ${LETTERS[ans.selectedIndex]}` : 'Unattempted';
  }
  if (ans.type === 'multi-mcq') {
    return ans.selectedIndices.length > 0
      ? ans.selectedIndices.map((i) => `Option ${LETTERS[i]}`).join(', ')
      : 'Unattempted';
  }
  return 'Unattempted';
}

function formatOfficialAnswer(q: TestQuestionRecord): string {
  if (q.questionType === 'integer') {
    return q.numericalAnswer ?? '—';
  }
  return (q.correctOptionIndices ?? []).map((i) => `Option ${LETTERS[i]}`).join(', ') || '—';
}

export function AttemptReviewModal({ attempt, questions, onClose }: AttemptReviewModalProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'correct' | 'skipped'>('all');
  const [aiExplanations, setAiExplanations] = useState<Record<string, GeminiQuestionExplanation>>({});
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiErrorById, setAiErrorById] = useState<Record<string, string>>({});

  const timingMap = useMemo(
    () => new Map(attempt.questionTimings.map((t) => [t.questionId, t])),
    [attempt.questionTimings]
  );

  const testQuestions = useMemo(
    () =>
      questions
        .filter((q) => q.testId === attempt.testId)
        .sort((a, b) => a.questionNumber - b.questionNumber),
    [attempt.testId, questions]
  );

  const filteredQuestions = useMemo(() => {
    return testQuestions.filter((q) => {
      const timing = timingMap.get(q.id);
      if (filterMode === 'all') return true;
      if (filterMode === 'correct') return Boolean(timing?.answered && timing?.isCorrect);
      if (filterMode === 'incorrect') return Boolean(timing?.answered && !timing?.isCorrect);
      return !timing?.answered;
    });
  }, [filterMode, testQuestions, timingMap]);

  const timeSeriesData = useMemo(
    () =>
      attempt.questionTimings.map((t) => ({
        q: `Q${t.questionNumber}`,
        seconds: t.timeSpentSeconds,
        status: !t.answered ? 'Skipped' : t.isCorrect ? 'Correct' : 'Incorrect',
      })),
    [attempt.questionTimings]
  );

  const handleExplainWithAi = async (q: TestQuestionRecord) => {
    playClick();
    setAiLoadingId(q.id);
    setAiErrorById((prev) => ({ ...prev, [q.id]: '' }));
    try {
      const explanation = await requestGeminiQuestionExplanation({
        subjectName: q.subjectName,
        chapterName: q.chapterName,
        questionText: q.questionText || `Question ${q.questionNumber} (${q.subjectName})`,
        optionTexts: q.optionTexts,
        correctAnswer: formatOfficialAnswer(q),
        studentAnswer: formatStudentAnswer(q, attempt.answers?.[q.id]),
        solutionText: q.solutionText,
      });
      setAiExplanations((prev) => ({ ...prev, [q.id]: explanation }));
      playAiSparkle();
    } catch (err) {
      setAiErrorById((prev) => ({
        ...prev,
        [q.id]: err instanceof Error ? err.message : 'Gemini explanation failed.',
      }));
    } finally {
      setAiLoadingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Analysis and solutions for ${attempt.testTitle}`}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
    >
      <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-[#0E1629] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/80 dark:bg-[#111A2E]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
              Past Attempt Full Analysis &amp; Solutions
            </p>
            <h2 className="font-display text-base sm:text-xl font-extrabold text-[#0B1B3B] dark:text-white truncate">
              {attempt.testTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submitted {new Date(attempt.submittedAtIso).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close analysis modal"
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Compact KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 tabular-nums">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-500">Official Score</p>
              <p className="font-mono text-lg font-extrabold text-[#0B1B3B] dark:text-white">
                {attempt.score} / {attempt.maxScore}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-500">Accuracy</p>
              <p className="font-mono text-lg font-extrabold text-[#10B981]">
                {attempt.accuracyPercent}%
              </p>
              <p className="text-[10px] text-slate-500">
                {attempt.correctCount}✓ · {attempt.incorrectCount}✗ · {attempt.unattemptedCount} skip
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70">
              <p className="text-[11px] font-semibold text-[#2563EB] dark:text-sky-400 flex items-center gap-1">
                <Activity className="w-3 h-3" /> IQ Score
              </p>
              <p className="font-mono text-lg font-extrabold text-[#2563EB] dark:text-sky-300">
                {attempt.iqScore}/150
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Avg Pace
              </p>
              <p className="font-mono text-lg font-extrabold text-[#0B1B3B] dark:text-white">
                {attempt.avgTimePerQuestion}s/Q
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-[#F97316]" /> Room Warnings
              </p>
              <p
                className={`font-mono text-lg font-extrabold ${
                  (attempt.roomExitWarnings ?? 0) > 0 ? 'text-[#F97316]' : 'text-[#10B981]'
                }`}
              >
                {attempt.roomExitWarnings ?? 0}
              </p>
            </div>
          </div>

          {/* Graphs Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] space-y-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Subject-Wise Score &amp; Accuracy
              </h3>
              <div className="h-44 w-full">
                <RechartsContainer width="100%" height="100%">
                  <BarChart
                    data={attempt.subjectScores}
                    margin={{ top: 6, right: 10, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                    <XAxis dataKey="subjectName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" name="Score" fill="#2563EB" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="accuracyPercent" name="Accuracy %" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </RechartsContainer>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] space-y-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Time Spent Per Question (Seconds)
              </h3>
              <div className="h-44 w-full">
                <RechartsContainer width="100%" height="100%">
                  <BarChart
                    data={timeSeriesData}
                    margin={{ top: 6, right: 10, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                    <XAxis dataKey="q" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val) => [`${val}s`, 'Time']} />
                    <Bar dataKey="seconds" name="Seconds" radius={[6, 6, 0, 0]}>
                      {timeSeriesData.map((row, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            row.status === 'Correct'
                              ? '#10B981'
                              : row.status === 'Incorrect'
                                ? '#EF4444'
                                : '#94A3B8'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </RechartsContainer>
              </div>
            </div>
          </div>

          {/* Question-by-Question Review & Solutions */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white">
                Question-by-Question Solutions ({filteredQuestions.length} of {testQuestions.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: `All (${testQuestions.length})` },
                    { id: 'incorrect', label: `Wrong (${attempt.incorrectCount})` },
                    { id: 'correct', label: `Correct (${attempt.correctCount})` },
                    { id: 'skipped', label: `Skipped (${attempt.unattemptedCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setFilterMode(tab.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      filterMode === tab.id
                        ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {testQuestions.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Original questions for this test are no longer in the active catalog, though your score and pacing summary above remain saved.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((q) => {
                  const timing = timingMap.get(q.id);
                  const ans = attempt.answers?.[q.id];
                  const isCorrect = Boolean(timing?.answered && timing?.isCorrect);
                  const isWrong = Boolean(timing?.answered && !timing?.isCorrect);
                  const aiExp = aiExplanations[q.id];
                  const aiErr = aiErrorById[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 sm:p-4 rounded-xl border space-y-2.5 ${
                        isCorrect
                          ? 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/30 dark:bg-emerald-950/15'
                          : isWrong
                            ? 'border-rose-200 dark:border-rose-800/70 bg-rose-50/30 dark:bg-rose-950/15'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="font-mono font-bold text-[#0B1B3B] dark:text-white">
                            Q{q.questionNumber}
                          </span>
                          <span className="text-[#2563EB] dark:text-sky-400">{q.subjectName}</span>
                          {q.chapterName && (
                            <span className="text-slate-500 dark:text-slate-400">· {q.chapterName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          {timing && (
                            <span className="text-slate-500">
                              {timing.timeSpentSeconds}s · {timing.paceCategory}
                            </span>
                          )}
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : isWrong ? (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                              <XCircle className="w-3.5 h-3.5" /> Incorrect
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-500">Skipped</span>
                          )}
                        </div>
                      </div>

                      {q.questionText && (
                        <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                          {q.questionText}
                        </p>
                      )}
                      {q.questionImageUrl && (
                        <img
                          src={q.questionImageUrl}
                          alt={`Question ${q.questionNumber}`}
                          className="max-h-52 rounded-lg border border-slate-200 bg-white object-contain"
                        />
                      )}

                      {q.questionType !== 'integer' && q.optionTexts && q.optionTexts.some(Boolean) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {q.optionTexts.map((txt, idx) => {
                            const isOfficial = (q.correctOptionIndices ?? []).includes(idx);
                            const isPicked =
                              (ans?.type === 'single-mcq' && ans.selectedIndex === idx) ||
                              (ans?.type === 'multi-mcq' && ans.selectedIndices.includes(idx));
                            return (
                              <div
                                key={idx}
                                className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${
                                  isOfficial
                                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                                    : isPicked
                                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="font-mono font-bold">{LETTERS[idx]}.</span>
                                <span className="truncate">{txt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs">
                        <div className="flex flex-wrap gap-3">
                          <span>
                            Your Answer:{' '}
                            <strong className="font-mono">{formatStudentAnswer(q, ans)}</strong>
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Official Key:{' '}
                            <strong className="font-mono">{formatOfficialAnswer(q)}</strong>
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={aiLoadingId === q.id}
                          onClick={() => void handleExplainWithAi(q)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                        >
                          {aiLoadingId === q.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          {aiLoadingId === q.id ? 'Explaining...' : 'Explain with Gemini AI'}
                        </button>
                      </div>

                      {(q.solutionText || q.solutionImageUrl) && (
                        <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Official Solution
                          </p>
                          {q.solutionText && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {q.solutionText}
                            </p>
                          )}
                          {q.solutionImageUrl && (
                            <img
                              src={q.solutionImageUrl}
                              alt={`Solution for Q${q.questionNumber}`}
                              className="max-h-48 rounded border border-slate-200 bg-white object-contain"
                            />
                          )}
                        </div>
                      )}

                      {aiErr && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">{aiErr}</p>
                      )}

                      {aiExp && (
                        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800 space-y-1.5 text-xs">
                          <p className="font-bold text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                            Gemini AI Concept Breakdown
                          </p>
                          <p className="text-slate-800 dark:text-slate-200">
                            <strong>Concept: </strong>
                            {aiExp.coreConcept}
                          </p>
                          <ol className="list-decimal pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                            {aiExp.stepByStep.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                          <p className="text-emerald-800 dark:text-emerald-300 font-medium">
                            <strong>10-Sec Shortcut: </strong>
                            {aiExp.examShortcut}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
