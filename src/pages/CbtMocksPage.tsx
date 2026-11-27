import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  FileCheck2,
  Play,
  ShieldAlert,
  Sliders,
  Trophy,
  X,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { CbtExamRunner } from '../components/exam/CbtExamRunner';
import { AttemptReviewModal } from '../components/analytics/AttemptReviewModal';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import {
  getEffectiveTestInstructions,
  getEffectiveTestSyllabus,
} from '../utils/examPresets';
import { CANONICAL_ORIGIN, getHierarchicalMockTestPath } from '../utils/seoHelpers';
import { getTestCohortIds, testMatchesCohort } from '../utils/catalogMerge';
import { playClick } from '../utils/soundEffects';
import type { MockTestRecord, StudentCohortId, TestAttemptRecord, TestQuestionRecord } from '../types';

export default function CbtMocksPage() {
  const { cohortId } = useAuth();
  const { allCohorts, mockTests, questions, attempts } = usePlatformData();

  const [filterCohort, setFilterCohort] = useState<StudentCohortId | 'all'>(cohortId || 'all');
  const [patternFilter, setPatternFilter] = useState<'all' | 'full' | 'mini'>('all');
  const [activeTest, setActiveTest] = useState<MockTestRecord | null>(null);
  const [customQuestions, setCustomQuestions] = useState<TestQuestionRecord[] | null>(null);
  const [syllabusTest, setSyllabusTest] = useState<MockTestRecord | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<TestAttemptRecord | null>(null);

  useEffect(() => {
    if (cohortId) setFilterCohort(cohortId);
  }, [cohortId]);

  const publishedCbts = useMemo(
    () =>
      mockTests.filter((t) => {
        if (t.destination !== 'cbt-mock') return false;
        if (t.status !== 'published') return false;
        if (filterCohort !== 'all' && !testMatchesCohort(t, filterCohort)) return false;
        if (patternFilter === 'full' && t.totalQuestions < 75) return false;
        if (patternFilter === 'mini' && t.totalQuestions >= 75) return false;
        return true;
      }),
    [filterCohort, mockTests, patternFilter]
  );

  const cbtAttempts = useMemo(
    () => attempts.filter((a) => a.destination === 'cbt-mock'),
    [attempts]
  );

  const activeQuestions = useMemo(() => {
    if (!activeTest) return [];
    if (customQuestions && customQuestions.length > 0) return customQuestions;
    return questions.filter((q) => q.testId === activeTest.id);
  }, [activeTest, customQuestions, questions]);

  const syllabusModalData = useMemo(() => {
    if (!syllabusTest) return null;
    const linked = questions.filter((q) => q.testId === syllabusTest.id);
    return {
      syllabus: getEffectiveTestSyllabus(syllabusTest, linked),
      instructions: getEffectiveTestInstructions(syllabusTest),
      linkedCount: linked.length || syllabusTest.totalQuestions,
    };
  }, [questions, syllabusTest]);

  if (activeTest) {
    return (
      <PageLayout hideFooter hideSidebar hideMobileNav>
        <SeoHead
          title={`${activeTest.title} — CBT Mock Exam | PREPSKM.IN`}
          description={`NTA-style Computer Based Test session for ${activeTest.title} on PREPSKM.IN.`}
          canonicalPath="/cbt-mocks"
        />
        <ResponsiveContainer size="wide" className="py-6">
          <CbtExamRunner
            test={activeTest}
            questions={activeQuestions}
            onExit={() => {
              setActiveTest(null);
              setCustomQuestions(null);
            }}
          />
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SeoHead
        title="Free JEE Main & NEET NTA CBT Mock Tests | Prepskm"
        description="Attempt free full-syllabus NTA-pattern JEE Main (300 marks) and NEET UG (720 marks) CBT mock tests with +4/-1 marking, solutions, and rank analytics."
        canonicalPath="/cbt-mocks"
        keywords="NEET UG mock test free online, NEET 180 questions 720 marks CBT test, JEE Main full mock test NTA pattern, free NEET UG mock test 01 02 03 04 05, PREPSKM CBT mocks"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'PREPSKM Free JEE Main & NEET UG NTA CBT Mock Tests',
          url: `${CANONICAL_ORIGIN}/cbt-mocks`,
          numberOfItems: publishedCbts.length,
          itemListElement: publishedCbts.map((t, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: t.title,
            url: `${CANONICAL_ORIGIN}${getHierarchicalMockTestPath(t)}`,
          })),
        }}
      />

      <ResponsiveContainer className="py-8 sm:py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              NTA-Grade Exam Simulator
            </p>
            <h1 className="font-display text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
              CBT Mock Tests
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Inspect every mock test’s full chapter syllabus and exam-specific instructions before entering the proctored CBT exam room.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#111114] p-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'full', label: 'Full-Length 75Q+' },
                  { id: 'mini', label: 'Mini / Sectional' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playClick();
                    setPatternFilter(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    patternFilter === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <label htmlFor="cbt-cohort-filter" className="sr-only">
              Filter CBT mocks by class
            </label>
            <select
              id="cbt-cohort-filter"
              value={filterCohort}
              onChange={(e) => setFilterCohort(e.target.value as StudentCohortId | 'all')}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#111114] text-sm font-semibold"
            >
              <option value="all">All Published Mocks</option>
              <option value={cohortId}>My Selected Track</option>
              {allCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dedicated Custom CBT Mock Builder CTA Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#EEF4FF] via-[#F4F8FF] to-[#E6F7FF] dark:from-[#0F172A] dark:via-[#111D35] dark:to-[#0C2233] border border-[#06B6D4]/30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#22D3EE]">
              <Sliders className="w-3.5 h-3.5" />
              Dedicated Custom Builder
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white">
              Create Your Own Chapter-Locked CBT Mock Test
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Choose exact subjects, chapters, and question count (10Q, 25Q, 45Q, 75Q, or 180Q) with clean unprefixed stems and randomized A/B/C/D options.
            </p>
          </div>
          <Link
            to="/cbt-mocks/builder"
            onClick={() => playClick()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14] hover:opacity-95 transition-opacity shrink-0 whitespace-nowrap"
          >
            Build Custom Mock
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Published CBT Mocks Grid */}
        {publishedCbts.length === 0 ? (
          <ReusableCard className="py-14 text-center space-y-3">
            <ClipboardCheck className="w-10 h-10 text-slate-400 mx-auto" />
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
              No CBT Mock Tests for This Filter
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Switch to "All Published Mocks" to see all available JEE, NEET & Board CBT papers.
            </p>
            <ReusableButton variant="secondary" size="sm" onClick={() => setFilterCohort('all')}>
              Show All Published Mocks
            </ReusableButton>
          </ReusableCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {publishedCbts.map((t) => {
              const linkedCount = questions.filter((q) => q.testId === t.id).length;
              const testAttempts = cbtAttempts.filter((a) => a.testId === t.id);
              const bestAttempt =
                testAttempts.length > 0
                  ? testAttempts.reduce((best, cur) => (cur.score > best.score ? cur : best))
                  : null;
              const cohortLabel = getTestCohortIds(t)
                .map((id) => allCohorts.find((c) => c.id === id)?.shortLabel ?? id)
                .join(' · ');

              return (
                <ReusableCard
                  key={t.id}
                  interactive
                  padding="md"
                  className="flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span className="text-[#F97316]">{t.examType ?? t.examCategory}</span>
                      <span className="text-slate-500 dark:text-slate-400">{cohortLabel}</span>
                    </div>

                    <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white leading-snug">
                      <Link
                        to={getHierarchicalMockTestPath(t)}
                        className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                      >
                        {t.title}
                      </Link>
                    </h2>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                        <p className="text-slate-500 dark:text-slate-400">Questions</p>
                        <p className="font-mono font-bold text-sm text-[#0B1B3B] dark:text-white tabular-nums">
                          {linkedCount || t.totalQuestions}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                        <p className="text-slate-500 dark:text-slate-400">Duration</p>
                        <p className="font-mono font-bold text-sm text-[#0B1B3B] dark:text-white tabular-nums">
                          {t.durationMinutes}m
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                        <p className="text-slate-500 dark:text-slate-400">Marking</p>
                        <p className="font-mono font-bold text-sm text-[#0B1B3B] dark:text-white tabular-nums">
                          +{t.positiveMarks}/{t.negativeMarkingEnabled ? `-${t.negativeMarks}` : '0'}
                        </p>
                      </div>
                    </div>

                    {bestAttempt && (
                      <div className="flex items-center justify-between gap-2 text-xs pt-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          Best: {bestAttempt.score} / {bestAttempt.maxScore}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setReviewAttempt(testAttempts[testAttempts.length - 1]);
                          }}
                          className="inline-flex items-center gap-1 text-[#2563EB] dark:text-sky-400 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Solutions
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <ReusableButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        playClick();
                        setSyllabusTest(t);
                      }}
                      className="shrink-0"
                    >
                      <BookOpen className="w-4 h-4 text-[#2563EB]" />
                      Syllabus
                    </ReusableButton>

                    <ReusableButton
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        playClick();
                        setActiveTest(t);
                      }}
                    >
                      <Play className="w-4 h-4" />
                      {bestAttempt ? 'Reattempt' : 'Start CBT'}
                    </ReusableButton>
                  </div>
                </ReusableCard>
              );
            })}
          </div>
        )}

        {/* Recent CBT Attempt History */}
        {cbtAttempts.length > 0 && (
          <ReusableCard padding="sm" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#2563EB]" />
                Your Recent CBT Attempts ({cbtAttempts.length})
              </h2>
              <ReusableButton variant="ghost" size="sm" to="/analytics">
                Full Analytics
              </ReusableButton>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4">Test</th>
                    <th className="py-2 px-3">Official Score</th>
                    <th className="py-2 px-3">Accuracy</th>
                    <th className="py-2 px-3">IQ Score</th>
                    <th className="py-2 px-3">Room Warnings</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 pl-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 tabular-nums">
                  {[...cbtAttempts].reverse().slice(0, 8).map((att) => (
                    <tr key={att.id}>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                        {att.testTitle}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0B1B3B] dark:text-sky-300">
                        {att.score} / {att.maxScore}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {att.accuracyPercent}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#2563EB] dark:text-sky-400">
                        {att.iqScore}/150
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {(att.roomExitWarnings ?? 0) > 0 ? (
                          <span className="text-[#F97316] font-bold">
                            {att.roomExitWarnings} warning(s)
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">0 (Clean)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(att.submittedAtIso).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setReviewAttempt(att);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Analysis &amp; Solutions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReusableCard>
        )}
      </ResponsiveContainer>

      {/* Syllabus & Exam-Specific Instructions Modal */}
      {syllabusTest && syllabusModalData && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Test syllabus and instructions"
        >
          <ReusableCard className="w-full max-w-2xl max-h-[88vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  {syllabusTest.examType ?? syllabusTest.examCategory} · Official Syllabus
                </p>
                <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white mt-0.5">
                  {syllabusTest.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                  {syllabusModalData.linkedCount} Questions · {syllabusTest.durationMinutes} min ·{' '}
                  +{syllabusTest.positiveMarks}/
                  {syllabusTest.negativeMarkingEnabled ? `−${syllabusTest.negativeMarks}` : '0'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close syllabus modal"
                onClick={() => setSyllabusTest(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" />
                Subject & Chapter Syllabus
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {syllabusModalData.syllabus.map((row) => (
                  <div
                    key={row.subject}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB] dark:text-sky-400">
                      {row.subject}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {row.chapters.map((ch) => (
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

            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#F97316]" />
                Exam-Specific Instructions ({syllabusTest.examType ?? syllabusTest.examCategory})
              </h3>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
                {syllabusModalData.instructions.map((ins, idx) => (
                  <li key={idx}>{ins}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <ReusableButton variant="secondary" size="sm" onClick={() => setSyllabusTest(null)}>
                Close
              </ReusableButton>
              <ReusableButton
                variant="accent"
                size="sm"
                onClick={() => {
                  const chosen = syllabusTest;
                  setSyllabusTest(null);
                  setActiveTest(chosen);
                }}
              >
                <Play className="w-4 h-4" />
                Enter CBT Exam Room
              </ReusableButton>
            </div>
          </ReusableCard>
        </div>
      )}
      {reviewAttempt && (
        <AttemptReviewModal
          attempt={reviewAttempt}
          questions={questions}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </PageLayout>
  );
}
