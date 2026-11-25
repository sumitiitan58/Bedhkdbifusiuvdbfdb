export interface FaqItem {
  q: string;
  a: string;
}

export const ABOUT_FAQS: FaqItem[] = [
  {
    q: 'Who created PREPSKM.IN and where can I follow official updates?',
    a: 'PREPSKM.IN is built by Sumit (@unfiltereddsumit) to give Class 9–12 Board, JEE Main, JEE Advanced, and NEET UG students a fast, distraction-free study platform. You can follow @unfiltereddsumit on Instagram, YouTube, X (Twitter), Telegram, and GitHub.',
  },
  {
    q: 'Are chapter-wise notes, DPPs, and CBT mock tests free to use?',
    a: 'Yes. Students can read and download chapter-wise concise notes, formula sheets, and mind maps, solve timed chapter DPPs, and attempt full-syllabus NTA-pattern JEE and NEET CBT mock tests free of charge.',
  },
  {
    q: 'Can I review past CBT mock test analysis and step-by-step solutions anytime?',
    a: 'Yes. Open Test Analysis or All Tests (CBT) and click "Analysis & Solutions" on any submitted attempt to inspect your official score, predicted percentile, subject-wise accuracy, pacing breakdown, and full solutions.',
  },
  {
    q: 'How does the Mistake Notebook and Preps AI mentor help improve exam scores?',
    a: 'Every wrong or skipped question from your CBT mocks and DPPs is automatically saved to your Mistake Notebook for re-attempting. You can ask Preps AI in English or Hinglish to explain mistakes step-by-step and build a targeted 7-day revision plan.',
  },
  {
    q: 'How does the CBT Mock Test Room-Exit Warning work?',
    a: 'Switching tabs, minimizing the browser, or leaving the exam window during a live CBT mock triggers an instant focus warning alert and logs exam discipline on your final scorecard so you build real test-day stamina.',
  },
];

export function buildChapterFaqs(params: {
  chapterName: string;
  subjectName: string;
  cohortLabel: string;
  resourceLabel: string;
}): FaqItem[] {
  const { chapterName, subjectName, cohortLabel, resourceLabel } = params;
  return [
    {
      q: `Is this ${chapterName} ${resourceLabel.toLowerCase()} PDF free to download for ${cohortLabel}?`,
      a: `Yes. You can read the complete ${chapterName} ${resourceLabel.toLowerCase()} inside the full-screen viewer on PREPSKM.IN or download the PDF free for offline ${cohortLabel} ${subjectName} revision.`,
    },
    {
      q: `Does the ${chapterName} ${resourceLabel.toLowerCase()} follow the latest NCERT and NTA syllabus?`,
      a: `Yes. Every ${subjectName} chapter resource on PREPSKM.IN is aligned with NCERT fundamentals and current NTA exam weightage, covering key formulas, concepts, and common exam traps for ${chapterName}.`,
    },
    {
      q: `How should I practice ${chapterName} after reading these notes?`,
      a: `After revising ${chapterName}, solve timed chapter-wise Daily Practice Problems (DPPs) and attempt an NTA-pattern CBT Mock Test on PREPSKM.IN. Any incorrect or skipped problems automatically move to your Mistake Notebook for targeted re-attempts.`,
    },
  ];
}

export function buildFaqPageJsonLd(faqs: FaqItem[]): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

export function buildChapterSeoTitle(
  cleanChapterName: string,
  resourceLabel: string,
  subjectName: string
): string {
  const full = `${cleanChapterName} ${resourceLabel} – ${subjectName} | Prepskm`;
  if (full.length <= 60) return full;
  const compact = `${cleanChapterName} ${resourceLabel} | Prepskm`;
  if (compact.length <= 60) return compact;
  const maxChapterLen = Math.max(16, 46 - resourceLabel.length);
  return `${cleanChapterName.slice(0, maxChapterLen).trim()} ${resourceLabel} | Prepskm`;
}

export function buildChapterSeoDescription(params: {
  cleanChapterName: string;
  resourceLabel: string;
  primaryCohortLabel: string;
  subjectName: string;
  customDescription?: string;
}): string {
  const custom = params.customDescription?.trim();
  const base =
    custom ||
    `Download free ${params.cleanChapterName} ${params.resourceLabel.toLowerCase()} PDF for ${params.primaryCohortLabel} ${params.subjectName}. Includes formulas, NCERT highlights, and exam revision tips.`;
  return base.length <= 155 ? base : `${base.slice(0, 152).trim()}...`;
}

export function buildTestSeoTitle(testTitle: string, isDpp: boolean): string {
  const suffix = isDpp ? 'DPP | Prepskm' : 'CBT Mock | Prepskm';
  const full = `${testTitle} – ${suffix}`;
  if (full.length <= 60) return full;
  const maxBase = Math.max(18, 57 - suffix.length);
  return `${testTitle.slice(0, maxBase).trim()} – ${suffix}`;
}

export function buildTestSeoDescription(params: {
  title: string;
  isDpp: boolean;
  cohortLabel: string;
  totalQuestions: number;
  durationMinutes: number;
  customDescription?: string;
}): string {
  const custom = params.customDescription?.trim();
  const base =
    custom ||
    `Attempt ${params.title} free ${params.isDpp ? 'Chapter DPP' : 'NTA CBT Mock Test'} for ${params.cohortLabel} on Prepskm with ${params.totalQuestions} questions, ${params.durationMinutes} min timer & solutions.`;
  return base.length <= 155 ? base : `${base.slice(0, 152).trim()}...`;
}
