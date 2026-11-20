import { useMemo, useState } from 'react';
import {
  CheckCircle2,
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
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import type { MockTestRecord, StudentCohortId } from '../types';

export default function DppPage() {
  const { cohortId } = useAuth();
  const { allCohorts, subjects, chapters, mockTests, questions, attempts } = usePlatformData();

  const [selectedCohort, setSelectedCohort] = useState<StudentCohortId | 'all'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [activeDpp, setActiveDpp] = useState<MockTestRecord | null>(null);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c.name])), [chapters]);

  const availableChapters = useMemo(
    () =>
      chapters.filter(
        (c) => selectedSubjectId === 'all' || c.subjectId === selectedSubjectId
      ),
    [chapters, selectedSubjectId]
  );

  const publishedDpps = useMemo(
    () =>
      mockTests.filter((t) => {
        if (t.destination !== 'dpp' || t.status !== 'published') return false;
        if (selectedCohort !== 'all' && t.cohortId !== selectedCohort) return false;
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

  const activeQuestions = useMemo(
    () => (activeDpp ? questions.filter((q) => q.testId === activeDpp.id) : []),
    [activeDpp, questions]
  );

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
            onExit={() => setActiveDpp(null)}
          />
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SeoHead
        title="Chapter-Wise DPP Practice — PREPSKM.IN"
        description="Solve timed chapter-wise Daily Practice Problems (DPPs) with instant evaluation, optional negative marking, detailed solutions, and reattempt history."
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
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Targeted Daily Practice Problems supporting Single MCQ, Multi-Correct, and Integer questions with step-by-step solutions.
          </p>
        </div>

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
                onChange={(e) => setSelectedCohort(e.target.value as StudentCohortId | 'all')}
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
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {publishedDpps.map((dpp) => {
              const qCount = questions.filter((q) => q.testId === dpp.id).length;
              const prevAttempts = dppAttempts.filter((a) => a.testId === dpp.id);
              const latest = prevAttempts[prevAttempts.length - 1];
              const subName = dpp.subjectId ? subjectMap.get(dpp.subjectId) : dpp.examCategory;
              const chName = dpp.chapterId ? chapterMap.get(dpp.chapterId) : 'Mixed Practice';

              return (
                <ReusableCard
                  key={dpp.id}
                  interactive
                  className="flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-sky-700 dark:text-sky-400">{subName}</span>
                      <span className="text-slate-500 dark:text-slate-400">{chName}</span>
                    </div>

                    <h2 className="font-display text-lg font-bold text-[#0F214D] dark:text-white leading-snug">
                      {dpp.title}
                    </h2>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums pt-1">
                      <span>{qCount || dpp.totalQuestions} Questions</span>
                      <span>·</span>
                      <span>{dpp.durationMinutes} min timer</span>
                      <span>·</span>
                      <span>
                        {dpp.negativeMarkingEnabled
                          ? `+${dpp.positiveMarks} / -${dpp.negativeMarks}`
                          : `+${dpp.positiveMarks} (No Negative)`}
                      </span>
                    </div>

                    {latest && (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 pt-1 tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Latest: {latest.score}/{latest.maxScore} ({latest.accuracyPercent}% accuracy) ·{' '}
                        {prevAttempts.length} attempt(s)
                      </p>
                    )}
                  </div>

                  <ReusableButton
                    variant={latest ? 'secondary' : 'primary'}
                    className="w-full"
                    onClick={() => setActiveDpp(dpp)}
                  >
                    {latest ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {latest ? 'Reattempt DPP' : 'Solve DPP Now'}
                  </ReusableButton>
                </ReusableCard>
              );
            })}
          </div>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
