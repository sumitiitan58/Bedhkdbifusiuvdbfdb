import { useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  BookMarked,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  RotateCcw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { usePlatformData } from '../context/PlatformDataContext';
import { extractMistakeEntries } from '../utils/testAnalysisEngine';
import { evaluateSingleQuestion } from '../utils/scoringEngine';
import { playClick, playSuccess } from '../utils/soundEffects';
import type { StudentAnswerValue, TestQuestionRecord } from '../types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

interface ReattemptCardProps {
  question: TestQuestionRecord;
  metaLine: string;
  statusTag: 'wrong' | 'unattempted' | 'vault';
  isResolved: boolean;
  isBookmarked: boolean;
  onToggleResolved?: () => void;
  onToggleBookmark: () => void;
}

function InteractiveQuestionVaultCard({
  question,
  metaLine,
  statusTag,
  isResolved,
  isBookmarked,
  onToggleResolved,
  onToggleBookmark,
}: ReattemptCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<number[]>([]);
  const [integerInput, setIntegerInput] = useState('');
  const [checkedResult, setCheckedResult] = useState<'correct' | 'wrong' | null>(null);
  const [showSolution, setShowSolution] = useState(false);

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

      {/* Question Prompt / Image */}
      <div className="space-y-3">
        {question.questionImageUrl && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-3">
            <img
              src={question.questionImageUrl}
              alt={`Question ${question.questionNumber}`}
              className="max-h-72 w-auto mx-auto object-contain"
            />
          </div>
        )}
        {question.questionText && (
          <p className="text-base text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
            {question.questionText}
          </p>
        )}
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
            const optText = question.optionTexts?.[idx];
            const isSelected =
              question.questionType === 'multi-mcq'
                ? selectedMulti.includes(idx)
                : selectedIndex === idx;
            const isCorrectOpt = (question.correctOptionIndices ?? []).includes(idx);

            let stateClass =
              'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-[#2563EB]';
            if (showSolution && isCorrectOpt) {
              stateClass =
                'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100';
            } else if (checkedResult === 'wrong' && isSelected && !isCorrectOpt) {
              stateClass =
                'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100';
            } else if (isSelected) {
              stateClass =
                'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40 text-[#0B1B3B] dark:text-white';
            }

            return (
              <button
                key={letter}
                type="button"
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
                className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${stateClass}`}
              >
                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {letter}
                </span>
                <span className="text-sm leading-snug">{optText || `Option ${letter}`}</span>
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
            Official Answer: <span className="font-mono text-emerald-700 dark:text-emerald-400">{officialAnswerText}</span>
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
    </ReusableCard>
  );
}

export default function MistakeNotebookPage() {
  const {
    attempts,
    questions,
    bookmarkedQuestionIds,
    resolvedMistakeIds,
    toggleQuestionBookmark,
    toggleMistakeResolved,
  } = usePlatformData();

  const [activeTab, setActiveTab] = useState<'mistakes' | 'vault'>('mistakes');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'wrong' | 'unattempted' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const resolvedSet = useMemo(() => new Set(resolvedMistakeIds), [resolvedMistakeIds]);
  const bookmarkSet = useMemo(() => new Set(bookmarkedQuestionIds), [bookmarkedQuestionIds]);

  const allMistakes = useMemo(
    () => extractMistakeEntries(attempts, questions),
    [attempts, questions]
  );

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

  const activeMistakesCount = allMistakes.filter((m) => !resolvedSet.has(m.questionId)).length;
  const masteredCount = allMistakes.filter((m) => resolvedSet.has(m.questionId)).length;

  return (
    <PageLayout>
      <SeoHead
        title="Auto Mistake Notebook & Important Question Vault | PREPSKM.IN"
        description="Re-attempt wrong and unattempted JEE/NEET questions automatically captured from CBT tests and revise your bookmarked tricky questions."
        canonicalPath="/mistakes"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Retention &amp; Error Elimination Engine
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
              Mistake Notebook &amp; Question Vault
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Every wrong and skipped question from your CBT tests is automatically logged here for targeted re-attempting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <ReusableButton variant="secondary" size="sm" to="/preps-ai">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              Ask Preps AI to Fix Mistakes
            </ReusableButton>
            <ReusableButton variant="primary" size="sm" to="/cbt-mocks">
              <ClipboardCheck className="w-4 h-4" />
              Take CBT Mock
            </ReusableButton>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 tabular-nums">
          <ReusableCard>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Pending Mistakes
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
              {activeMistakesCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Wrong &amp; unattempted questions awaiting re-attempt
            </p>
          </ReusableCard>

          <ReusableCard>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Mastered Mistakes
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-[#10B981]">
              {masteredCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Errors resolved through active re-attempting
            </p>
          </ReusableCard>

          <ReusableCard>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Important Question Vault
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
              {vaultedQuestions.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tricky questions bookmarked for last-minute revision
            </p>
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
                    ? 'Submit any CBT Mock Test or Chapter DPP and every wrong or skipped question will automatically appear here with instant re-attempt practice.'
                    : 'Clear your subject or status filter to see all logged mistakes.'}
                </p>
              </div>
              <ReusableButton variant="accent" to="/cbt-mocks">
                <ClipboardCheck className="w-4 h-4" />
                Attempt a CBT Mock Test
              </ReusableButton>
            </ReusableCard>
          ) : (
            <div className="space-y-6">
              {filteredMistakes.map((entry) => (
                <InteractiveQuestionVaultCard
                  key={entry.questionId}
                  question={entry.question}
                  metaLine={`From ${entry.testTitle} · Spent ${entry.timeSpentSeconds}s · Logged ${entry.occurrences}×`}
                  statusTag={entry.status}
                  isResolved={resolvedSet.has(entry.questionId)}
                  isBookmarked={bookmarkSet.has(entry.questionId)}
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
                Click the <strong>Save</strong> bookmark button on any tricky question during Test Analysis or Solution Review to build your personal last-minute revision vault.
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
                onToggleBookmark={() => toggleQuestionBookmark(q.id)}
              />
            ))}
          </div>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
