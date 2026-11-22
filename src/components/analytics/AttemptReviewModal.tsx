import { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  ShieldAlert,
  X,
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
import { SolutionCardDeck, type SolutionReviewItem } from '../exam/SolutionCardDeck';

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

  const reviewItems = useMemo<SolutionReviewItem[]>(() => {
    return testQuestions.map((q) => {
      const timing = timingMap.get(q.id);
      const status = !timing?.answered
        ? 'skipped'
        : timing.isCorrect
          ? 'correct'
          : 'wrong';
      return {
        question: q,
        studentAnswer: attempt.answers?.[q.id],
        status,
        timing,
      };
    });
  }, [attempt.answers, testQuestions, timingMap]);

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

          {/* Swipeable Stacked Solution Cards with Top Question Number Strip */}
          {testQuestions.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              Original questions for this test are no longer in the active catalog, though your score and pacing summary above remain saved.
            </div>
          ) : (
            <SolutionCardDeck
              items={reviewItems}
              title="Question-by-Question Solutions"
              onExplainWithAi={handleExplainWithAi}
              aiExplanations={aiExplanations}
              aiLoadingId={aiLoadingId}
              aiErrorById={aiErrorById}
            />
          )}
        </div>
      </div>
    </div>
  );
}
