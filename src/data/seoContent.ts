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
    q: 'How are Chapter DPPs integrated inside Study Materials?',
    a: 'Timed Chapter DPPs are built directly into Study Materials. You can revise Short Notes, Formula Sheets, Mind Maps, and PYQs for any chapter and launch matching Chapter DPPs inline with +4/-1 NTA scoring and instant solutions.',
  },
  {
    q: 'How is the Prep Score (0–100) calculated?',
    a: 'Your Prep Score is calibrated on a 0–100 scale across four weighted pillars: Pacing & Time Efficiency (25 pts), High-Yield Chapter Weightage (30 pts), Accuracy & Negative Control (25 pts), and Consistency & Mistake Recovery (20 pts). Scoring 85+ indicates AIR Top 1000 exam readiness.',
  },
  {
    q: 'How do AI Error Analysis and Personalized Re-Attempt Sets work in Mistake Notebook?',
    a: 'Every wrong or skipped question is automatically categorized by root cause (rushed slips, time-sinks, conceptual gaps, or skipped topics). You can generate targeted timed re-attempt sets from high-risk or weak chapters and ask Preps AI for step-by-step error fixes.',
  },
  {
    q: 'Can I sync my test analytics to Google Sheets and manage study tasks in Google Tasks?',
    a: 'Yes. From the Dashboard or Test Analysis page, you can export a 3-tab Prep Score & Test Analytics workbook to Google Sheets and manage study goals in Google Tasks. Every write action asks for your explicit confirmation first and keeps OAuth tokens strictly in memory.',
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
      a: `After revising ${chapterName}, launch an inline Chapter DPP directly inside Study Materials and attempt an NTA-pattern CBT Mock Test on PREPSKM.IN. Incorrect or skipped questions automatically enter your AI Mistake Notebook for personalized re-attempt drills.`,
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
