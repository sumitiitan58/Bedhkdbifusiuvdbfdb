import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { CbtExamRunner } from '../components/exam/CbtExamRunner';
import { usePlatformData } from '../context/PlatformDataContext';
import { STARTER_QUESTIONS, STARTER_TESTS } from '../services/starterCatalog';
import {
  getEffectiveTestInstructions,
  getEffectiveTestSyllabus,
} from '../utils/examPresets';
import {
  buildMockTestSeoSummary,
  CANONICAL_ORIGIN,
  getHierarchicalMockTestPath,
  getMockTestSlug,
} from '../utils/seoHelpers';
import { getTestCohortIds } from '../utils/catalogMerge';
import { playClick } from '../utils/soundEffects';

export default function CbtMockDetailPage() {
  const { slug, testSlug, chapterSlug } = useParams<{
    slug?: string;
    examSlug?: string;
    testSlug?: string;
    classSlug?: string;
    chapterSlug?: string;
  }>();
  const { allCohorts, mockTests, questions } = usePlatformData();
  const [started, setStarted] = useState(false);

  const activeSlug = testSlug || chapterSlug || slug || '';

  const test = useMemo(() => {
    if (!activeSlug) return null;
    const normalized = activeSlug.toLowerCase();
    const matchFn = (t: (typeof mockTests)[number]) =>
      t.status === 'published' &&
      (getMockTestSlug(t) === normalized || t.id.toLowerCase() === normalized);
    return mockTests.find(matchFn) ?? STARTER_TESTS.find(matchFn) ?? null;
  }, [mockTests, activeSlug]);

  const linkedQuestions = useMemo(() => {
    if (!test) return [];
    const live = questions.filter((q) => q.testId === test.id);
    const source = live.length > 0 ? live : STARTER_QUESTIONS.filter((q) => q.testId === test.id);
    return [...source].sort((a, b) => a.questionNumber - b.questionNumber);
  }, [questions, test]);

  if (!test) {
    return (
      <PageLayout>
        <SeoHead
          title="Mock Test Not Found | PREPSKM.IN"
          description="Attempt free NTA-pattern JEE Main, JEE Advanced & NEET CBT mock tests on PREPSKM.IN."
          canonicalPath="/cbt-mocks"
        />
        <ResponsiveContainer size="narrow" className="py-16">
          <ReusableCard className="text-center space-y-4">
            <ClipboardCheck className="w-10 h-10 text-slate-400 mx-auto" />
            <h1 className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white">
              Mock Test Not Found
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This test link may have changed or is currently unpublished. Browse all live NTA CBT Mock Tests below.
            </p>
            <ReusableButton variant="primary" size="sm" to="/cbt-mocks">
              View All CBT Mock Tests
            </ReusableButton>
          </ReusableCard>
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  const isDpp = test.destination === 'dpp';
  const parentRoute = isDpp ? '/dpp' : '/cbt-mocks';
  const parentLabel = isDpp ? 'Chapter-Wise DPPs' : 'CBT Mock Tests';
  const canonicalPath = getHierarchicalMockTestPath(test);
  const cohortLabel = getTestCohortIds(test)
    .map((id) => allCohorts.find((c) => c.id === id)?.label ?? id)
    .join(' · ');
  const syllabus = getEffectiveTestSyllabus(test, linkedQuestions);
  const instructions = getEffectiveTestInstructions(test);
  const totalQuestions = linkedQuestions.length || test.totalQuestions;
  const syllabusSummary = syllabus
    .map((s) => `${s.subject} (${s.chapters.slice(0, 3).join(', ')})`)
    .join('; ');

  const seoSummary = buildMockTestSeoSummary({
    title: test.title,
    examCategory: test.examType ?? test.examCategory,
    cohortLabel,
    durationMinutes: test.durationMinutes,
    totalQuestions,
    totalMarks: test.totalMarks,
    positiveMarks: test.positiveMarks,
    negativeMarks: test.negativeMarks,
    negativeMarkingEnabled: test.negativeMarkingEnabled,
    syllabusSummary,
  });

  const pageTitle = isDpp
    ? `${test.title} – ${cohortLabel} Chapter DPP | PREPSKM.IN`
    : `${test.title} – ${cohortLabel} Free NTA CBT Mock Test | PREPSKM.IN`;

  const metaDesc =
    test.seoDescription?.trim() ||
    `Attempt ${test.title} free ${isDpp ? 'Chapter DPP' : 'NTA CBT Mock Test'} for ${cohortLabel} on PREPSKM.IN — ${totalQuestions} questions, ${test.durationMinutes} min, +${test.positiveMarks}/-${test.negativeMarkingEnabled ? test.negativeMarks : 0} marking & instant solutions.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Quiz',
        name: test.title,
        description: metaDesc,
        educationalLevel: cohortLabel,
        url: `${CANONICAL_ORIGIN}${canonicalPath}`,
        provider: {
          '@type': 'EducationalOrganization',
          name: 'PREPSKM.IN',
          url: CANONICAL_ORIGIN,
        },
        isAccessibleForFree: true,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${CANONICAL_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: parentLabel,
            item: `${CANONICAL_ORIGIN}${parentRoute}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: test.title,
            item: `${CANONICAL_ORIGIN}${canonicalPath}`,
          },
        ],
      },
    ],
  };

  if (started) {
    return (
      <PageLayout hideFooter>
        <SeoHead
          title={pageTitle}
          description={metaDesc}
          canonicalPath={canonicalPath}
          jsonLd={jsonLd}
        />
        <ResponsiveContainer size="wide" className="py-6">
          <CbtExamRunner
            test={test}
            questions={linkedQuestions}
            onExit={() => setStarted(false)}
          />
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SeoHead
        title={pageTitle}
        description={metaDesc}
        canonicalPath={canonicalPath}
        keywords={`${test.title}, ${test.examCategory}, ${cohortLabel}, PREPSKM.IN mock test, NTA CBT, chapter DPP`}
        jsonLd={jsonLd}
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to={parentRoute} className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors">
            {parentLabel}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[#0B1B3B] dark:text-slate-200 font-semibold truncate">{test.title}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={parentRoute}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#0B1B3B] dark:text-white bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 hover:border-[#2563EB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All {parentLabel}
          </Link>

          <ReusableButton
            variant="accent"
            size="md"
            onClick={() => {
              playClick();
              setStarted(true);
            }}
          >
            <Play className="w-4 h-4" />
            {isDpp ? 'Solve Chapter DPP Now' : 'Start NTA CBT Exam Now'}
          </ReusableButton>
        </div>

        <ReusableCard className="space-y-4 rounded-2xl border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-[#F97316]">{test.examType ?? test.examCategory}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[#2563EB] dark:text-sky-400">{cohortLabel}</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white leading-tight">
            {test.title}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500">Questions</p>
              <p className="font-mono text-lg font-bold text-[#0B1B3B] dark:text-white">{totalQuestions}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500">Total Marks</p>
              <p className="font-mono text-lg font-bold text-[#0B1B3B] dark:text-white">{test.totalMarks}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Duration
              </p>
              <p className="font-mono text-lg font-bold text-[#0B1B3B] dark:text-white">{test.durationMinutes} min</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500">Marking Scheme</p>
              <p className="font-mono text-lg font-bold text-[#10B981]">
                +{test.positiveMarks} / {test.negativeMarkingEnabled ? `-${test.negativeMarks}` : '0'}
              </p>
            </div>
          </div>
        </ReusableCard>

        {/* Syllabus & Exam Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ReusableCard className="space-y-3 rounded-2xl border-slate-200/80">
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2563EB]" />
              Test Syllabus Breakdown
            </h2>
            <div className="space-y-2.5">
              {syllabus.map((row) => (
                <div
                  key={row.subject}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB] dark:text-sky-400">
                    {row.subject}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {row.chapters.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </ReusableCard>

          <ReusableCard className="space-y-3 rounded-2xl border-slate-200/80">
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#F97316]" />
              NTA CBT Exam Instructions
            </h2>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
              {instructions.map((ins, idx) => (
                <li key={idx}>{ins}</li>
              ))}
            </ul>
          </ReusableCard>
        </div>

        {/* 150-Word SEO Overview (Search Indexing, visually hidden) */}
        <section aria-label={`About ${test.title}`} className="sr-only">
          <h2>About {test.title}</h2>
          <p>{seoSummary}</p>
          <nav aria-label="Related exam resources">
            <Link to="/materials">Revise Chapter Concise Notes</Link>
            <Link to="/dpp">Solve Daily Practice Problems</Link>
          </nav>
        </section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
