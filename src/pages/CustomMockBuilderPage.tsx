import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sliders } from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { CbtExamRunner } from '../components/exam/CbtExamRunner';
import { CustomMockAndTemperamentHub } from '../components/cbt-engine/CustomMockAndTemperamentHub';
import { playNav } from '../utils/soundEffects';
import type { MockTestRecord, TestQuestionRecord } from '../types';

export default function CustomMockBuilderPage() {
  const [activeTest, setActiveTest] = useState<MockTestRecord | null>(null);
  const [customQuestions, setCustomQuestions] = useState<TestQuestionRecord[]>([]);

  if (activeTest && customQuestions.length > 0) {
    return (
      <PageLayout hideFooter hideSidebar hideMobileNav>
        <SeoHead
          title={`${activeTest.title} — CBT Exam Room | Prepskm`}
          description={`Live NTA-pattern CBT Mock session for ${activeTest.title} on Prepskm.`}
          canonicalPath="/cbt-mocks/builder"
        />
        <ResponsiveContainer size="wide" className="py-6">
          <CbtExamRunner
            test={activeTest}
            questions={customQuestions}
            onExit={() => {
              setActiveTest(null);
              setCustomQuestions([]);
            }}
          />
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SeoHead
        title="Custom CBT Mock Builder | Prepskm"
        description="Build chapter-accurate custom JEE & NEET CBT mock tests with balanced subjects, randomized answer options, and instant post-test analysis."
        canonicalPath="/cbt-mocks/builder"
      />

      <ResponsiveContainer className="py-8 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/cbt-mocks"
              onClick={() => playNav()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] dark:text-[#06B6D4] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to CBT Mock Tests
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white flex items-center gap-2.5">
              <Sliders className="w-6 h-6 text-[#06B6D4]" />
              Custom CBT Mock Builder
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select exact subjects, question count, and target chapters to generate a clean, chapter-accurate mock test with randomized options.
            </p>
          </div>
        </div>

        <CustomMockAndTemperamentHub
          onLaunchCustomTest={(generatedTest, generatedQs) => {
            setCustomQuestions(generatedQs);
            setActiveTest(generatedTest);
          }}
        />
      </ResponsiveContainer>
    </PageLayout>
  );
}
