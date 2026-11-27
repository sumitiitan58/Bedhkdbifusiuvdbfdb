import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Play,
  RotateCcw,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { CbtExamRunner } from '../components/exam/CbtExamRunner';
import { AttemptReviewModal } from '../components/analytics/AttemptReviewModal';
import { DppGeneratorPanel } from '../components/dpp/DppGeneratorPanel';
import { NativeBannerAd } from '../components/ads/NativeBannerAd';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import {
  filterChaptersByCohort,
  filterSubjectsByCohort,
  getTestCohortIds,
  testMatchesCohort,
} from '../utils/catalogMerge';
import { getHierarchicalMockTestPath } from '../utils/seoHelpers';
import { playClick } from '../utils/soundEffects';
import type { MockTestRecord, StudentCohortId, TestAttemptRecord, TestQuestionRecord } from '../types';

export default function DppPage() {
  const { cohortId } = useAuth();
  const { allCohorts, subjects, chapters, mockTests, questions, attempts } = usePlatformData();

  const [selectedCohort, setSelectedCohort] = useState<StudentCohortId | 'all'>(cohortId || 'all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [activeDpp, setActiveDpp] = useState<MockTestRecord | null>(null);
  const [customDppQuestions, setCustomDppQuestions] = useState<TestQuestionRecord[] | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<TestAttemptRecord | null>(null);

  useEffect(() => {
    if (cohortId) {
      setSelectedCohort(cohortId);
      setSelectedSubjectId('all');
      setSelectedChapterId('all');
    }
  }, [cohortId]);

  const visibleSubjects = useMemo(
    () => filterSubjectsByCohort(subjects, selectedCohort),
    [subjects, selectedCohort]
  );

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c.name])), [chapters]);
  const cohortLabelMap = useMemo(
    () => new Map(allCohorts.map((c) => [c.id, c.shortLabel])),
    [allCohorts]
  );

  const availableChapters = useMemo(
    () =>
      filterChaptersByCohort(chapters, selectedCohort).filter(
        (c) => selectedSubjectId === 'all' || c.subjectId === selectedSubjectId
      ),
    [chapters, selectedCohort, selectedSubjectId]
  );

  const publishedDpps = useMemo(
    () =>
      mockTests.filter((t) => {
        if (t.destination !== 'dpp' || t.status !== 'published') return false;
        if (selectedCohort !== 'all' && !testMatchesCohort(t, selectedCohort)) return false;
        if (selectedSubjectId !== 'all' && t.subjectId !== selectedSubjectId) return false;
        if (selectedChapterId !== 'all' && t.chapterId !== selectedChapterId) return false;
        return true;
      }),
    [mockTests, selectedChapterId, selectedCohort, selectedSubjectId]
  );

  const dppAttempts = useMemo(
    () => attempts.filter((a) => a.destination === 'dpp'),
    [attempts]
  );

  const activeQuestions = useMemo(() => {
    if (!activeDpp) return [];
    if (customDppQuestions && customDppQuestions.length > 0) return customDppQuestions;
    return questions.filter((q) => q.testId === activeDpp.id);
  }, [activeDpp, customDppQuestions, questions]);

  if (activeDpp) {
    return (
      <PageLayout hideFooter>
        <SeoHead
          title={`${activeDpp.title} — Chapter DPP | PREPSKM.IN`}
          description={`Timed Chapter-Wise Daily Practice Problem session for ${activeDpp.title}.`}
          canonicalPath="/dpp"
        />
        <ResponsiveContainer size="wide" className="py-6">
          <CbtExamRunner
            test={activeDpp}
            questions={activeQuestions}
            onExit={() => {
              setActiveDpp(null);
              setCustomDppQuestions(null);
            }}
          />
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SeoHead
        title="Chapter-Wise DPPs for JEE & NEET | Prepskm"
        description="Solve timed chapter-wise Daily Practice Problems (DPPs) for JEE, NEET & Boards with +4/-1 marking, step-by-step solutions, and instant analytics."
        canonicalPath="/dpp"
      />

      <ResponsiveContainer className="py-8 sm:py-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E86F0C]">
            Class → Subject → Chapter → DPP
          </p>
          <h1 className="font-display text-3xl font-extrabold text-[#0F214D] dark:text-white mt-0.5">
            Chapter-Wise DPP Practice
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Targeted Daily Practice Problems supporting Single MCQ, Multi-Correct, and Integer questions — plus instant custom chapter DPP generation.
          </p>
        </div>

        {/* Instant Generate DPP Builder for Any Chapter */}
        <DppGeneratorPanel
          cohortId={selectedCohort === 'all' ? cohortId : selectedCohort}
          subjects={visibleSubjects}
          chapters={availableChapters}
          allQuestions={questions}
          onLaunchDpp={(genTest, genQs) => {
            setCustomDppQuestions(genQs);
            setActiveDpp(genTest);
          }}
        />

        {/* Hierarchical Filter Strip */}
        <ReusableCard padding="sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="dpp-cohort" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Class / Cohort
              </label>
              <select
                id="dpp-cohort"
                value={selectedCohort}
                onChange={(e) => {
                  setSelectedCohort(e.target.value as StudentCohortId | 'all');
                  setSelectedSubjectId('all');
                  setSelectedChapterId('all');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="all">All Classes</option>
                <option value={cohortId}>My Selected Track</option>
                {allCohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dpp-subject" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Subject
              </label>
              <select
                id="dpp-subject"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedChapterId('all');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="all">All Track Subjects ({visibleSubjects.length})</option>
                {visibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dpp-chapter" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Chapter
              </label>
              <select
                id="dpp-chapter"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="all">All Chapters</option>
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ReusableCard>

        {/* DPP List */}
        {publishedDpps.length === 0 ? (
          <ReusableCard className="py-14 text-center space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
            <h2 className="font-display text-lg font-bold text-[#0F214D] dark:text-white">
              No DPPs Match This Filter
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Try resetting your chapter or subject filter to browse all available practice sets.
            </p>
            <ReusableButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedCohort('all');
                setSelectedSubjectId('all');
                setSelectedChapterId('all');
              }}
            >
              Reset Filters
            </ReusableButton>
          </ReusableCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {publishedDpps.map((dpp) => {
              const qCount = questions.filter((q) => q.testId === dpp.id).length;
              const prevAttempts = dppAttempts.filter((a) => a.testId === dpp.id);
              const latest = prevAttempts[prevAttempts.length - 1];
              const subName =
                (dpp.subjectId && subjectMap.get(dpp.subjectId)) ||
                dpp.syllabus?.[0]?.subject ||
                dpp.examCategory;
              const chName =
                (dpp.chapterId && chapterMap.get(dpp.chapterId)) ||
                dpp.syllabus?.[0]?.chapters?.[0] ||
                'Mixed Practice';
              const targetCohortText = getTestCohortIds(dpp)
                .map((cid) => cohortLabelMap.get(cid) ?? cid)
                .join(' · ');

              return (
                <ReusableCard
                  key={dpp.id}
                  interactive
                  padding="sm"
                  className="flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span className="text-sky-700 dark:text-sky-400 shrink-0">{subName}</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-[65%] text-right">
                        {chName}
                      </span>
                    </div>

                    <h2 className="font-display text-base sm:text-lg font-bold text-[#0F214D] dark:text-white leading-snug">
                      <Link
                        to={getHierarchicalMockTestPath(dpp)}
                        className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                      >
                        {dpp.title}
                      </Link>
                    </h2>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      <span>{qCount || dpp.totalQuestions} Qs</span>
                      <span>·</span>
                      <span>{dpp.durationMinutes}m</span>
                      <span>·</span>
                      <span>
                        {dpp.negativeMarkingEnabled
                          ? `+${dpp.positiveMarks} / -${dpp.negativeMarks}`
                          : `+${dpp.positiveMarks} (No Neg)`}
                      </span>
                      {targetCohortText && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {targetCohortText}
                          </span>
                        </>
                      )}
                    </div>

                    {latest && (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 pt-0.5 tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Latest: {latest.score}/{latest.maxScore} ({latest.accuracyPercent}%) ·{' '}
                        {prevAttempts.length} attempt(s)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {latest && (
                      <ReusableButton
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          playClick();
                          setReviewAttempt(latest);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                        Solutions
                      </ReusableButton>
                    )}
                    <ReusableButton
                      variant={latest ? 'accent' : 'primary'}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        playClick();
                        setActiveDpp(dpp);
                      }}
                    >
                      {latest ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {latest ? 'Reattempt' : 'Solve DPP Now'}
                    </ReusableButton>
                  </div>
                </ReusableCard>
              );
            })}
          </div>
        )}

        {/* Recent DPP Attempts with Solutions Access */}
        {dppAttempts.length > 0 && (
          <ReusableCard padding="sm" className="space-y-2.5">
            <h2 className="font-display text-base font-bold text-[#0F214D] dark:text-white">
              Past DPP Attempts &amp; Solutions ({dppAttempts.length})
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...dppAttempts].reverse().slice(0, 6).map((att) => (
                <div
                  key={att.id}
                  className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <div>
                    <p className="font-semibold text-[#0B1B3B] dark:text-white">{att.testTitle}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Score: {att.score}/{att.maxScore} · Accuracy: {att.accuracyPercent}% ·{' '}
                      {new Date(att.submittedAtIso).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setReviewAttempt(att);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Analysis &amp; Solutions
                  </button>
                </div>
              ))}
            </div>
          </ReusableCard>
        )}
        <NativeBannerAd />
      </ResponsiveContainer>

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
