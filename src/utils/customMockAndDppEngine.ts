import type { MockTestRecord, StudentCohortId, TestQuestionRecord } from '../types';
import { getDefaultExamInstructions } from './examPresets';

export type CustomMockCount = 10 | 25 | 45 | 75 | 180;
export type DifficultyMix = 'balanced' | 'high-yield' | 'challenge';

export interface BalancedMockRequest {
  questionCount: CustomMockCount;
  examType: 'JEE Main' | 'NEET UG';
  subjects: string[];
  chapters?: string[];
  difficultyMix?: DifficultyMix;
  aiBalanced?: boolean;
  weakChapters?: string[];
}

export interface BalancedMockSummary {
  test: MockTestRecord;
  questions: TestQuestionRecord[];
  subjectBreakdown: Array<{ subject: string; count: number }>;
}

export interface GenerateDppRequest {
  subjectName: string;
  chapterName: string;
  cohortId: StudentCohortId;
  questionCount: 10 | 15 | 20 | 25;
  difficulty: 'Concept Builder' | 'JEE/NEET Mains' | 'Advanced Tough';
  includeNumerical: boolean;
  subjectId?: string;
  chapterId?: string;
}

export interface GeneratedDppBundle {
  test: MockTestRecord;
  questions: TestQuestionRecord[];
}

export const GENERATED_DPPS_STORAGE_KEY = 'prepskm2_generated_dpps_v1';

/**
 * Computes balanced per-subject question counts summing cleanly to `totalCount`.
 * Example: 10Q across [Physics, Chemistry, Mathematics] => 4, 3, 3; 45Q => 15, 15, 15.
 */
export function computeBalancedSubjectQuota(
  totalCount: number,
  subjects: string[]
): Array<{ subject: string; count: number }> {
  const unique = Array.from(new Set(subjects.filter(Boolean)));
  const active = unique.length > 0 ? unique : ['Physics', 'Chemistry', 'Mathematics'];
  const base = Math.floor(totalCount / active.length);
  const remainder = totalCount % active.length;
  return active.map((subject, idx) => ({
    subject,
    count: base + (idx < remainder ? 1 : 0),
  }));
}

interface ChapterTemplate {
  questionText: string;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  solutionText: string;
  numericalAnswer?: string;
}

const SUBJECT_CURATED_TEMPLATES: Record<string, ChapterTemplate[]> = {
  Physics: [
    {
      questionText:
        'In {chapter}, a particle starts from rest under a constant net force $F$. The ratio of distances covered in the 2nd second to the 1st second is:',
      options: ['3 : 1', '2 : 1', '4 : 1', '1 : 2'],
      correctIdx: 0,
      solutionText:
        'Using $S_n = u + \\frac{a}{2}(2n - 1)$ with $u = 0$: $S_2 / S_1 = (2\\cdot 2 - 1)/(2\\cdot 1 - 1) = 3 : 1$.',
      numericalAnswer: '3',
    },
    {
      questionText:
        'For a core {chapter} conservation system, if the linear momentum $p$ increases by $100\\%$, the kinetic energy $K = p^2/(2m)$ increases by:',
      options: ['300%', '100%', '200%', '400%'],
      correctIdx: 0,
      solutionText:
        'New momentum $p\' = 2p \\implies K\' = (2p)^2/(2m) = 4K$. Percentage increase $= \\frac{4K - K}{K}\\times 100\\% = 300\\%$.',
      numericalAnswer: '300',
    },
    {
      questionText:
        'Dimensional analysis check in {chapter}: which physical pair has identical SI dimensions?',
      options: [
        'Torque and Work ($ML^2T^{-2}$)',
        'Impulse and Force ($MLT^{-2}$)',
        'Pressure and Energy Density ($ML^2T^{-2}$)',
        'Angular momentum and Linear momentum',
      ],
      correctIdx: 0,
      solutionText:
        'Both Torque ($\\vec{r}\\times\\vec{F}$) and Work ($\\vec{F}\\cdot\\vec{s}$) carry dimensions $[M L^2 T^{-2}]$.',
      numericalAnswer: '2',
    },
    {
      questionText:
        'In {chapter}, two identical resistors $R = 12\\,\\Omega$ are first connected in series and then in parallel across the same battery $V$. The ratio of power dissipated $P_{\\text{parallel}} / P_{\\text{series}}$ is:',
      options: ['4 : 1', '2 : 1', '1 : 4', '1 : 2'],
      correctIdx: 0,
      solutionText:
        '$R_s = 2R$ and $R_p = R/2$. Since $P = V^2/R_{\\text{eq}}$, $P_p / P_s = R_s / R_p = 2R / (R/2) = 4$.',
      numericalAnswer: '4',
    },
    {
      questionText:
        'A standard JEE/NEET {chapter} oscillation has time period $T = 2\\pi\\sqrt{m/k}$. If mass $m$ becomes $4m$ while spring constant $k$ stays constant, the new period is:',
      options: ['2T', '4T', 'T / 2', '√2 T'],
      correctIdx: 0,
      solutionText:
        'Since $T \\propto \\sqrt{m}$, quadrupling mass multiplies time period by $\\sqrt{4} = 2$.',
      numericalAnswer: '2',
    },
  ],
  Chemistry: [
    {
      questionText:
        'In {chapter}, which statement accurately governs reaction spontaneity under constant $T$ and $P$?',
      options: [
        '$\\Delta G = \\Delta H - T\\Delta S < 0$',
        '$\\Delta H > 0$ alone guarantees spontaneity',
        '$\\Delta S_{\\text{system}} < 0$ is always spontaneous',
        '$\\Delta G = 0$ means reaction is irreversible',
      ],
      correctIdx: 0,
      solutionText:
        'At constant temperature and pressure, Gibbs free energy change $\\Delta G = \\Delta H - T\\Delta S$ must be negative for a spontaneous process.',
      numericalAnswer: '0',
    },
    {
      questionText:
        'In {chapter} kinetics, a first-order reaction completes $75\\%$ in $40\\text{ min}$. Its half-life $t_{1/2}$ is:',
      options: ['20 min', '10 min', '30 min', '15 min'],
      correctIdx: 0,
      solutionText:
        'For first-order kinetics, $75\\%$ completion takes exactly $2\\,t_{1/2}$. Hence $t_{1/2} = 40 / 2 = 20\\text{ min}$.',
      numericalAnswer: '20',
    },
    {
      questionText:
        'For {chapter} equilibrium, if the reaction quotient $Q_c < K_c$, the system shifts spontaneously in which direction?',
      options: [
        'Forward direction (toward products)',
        'Backward direction (toward reactants)',
        'Remains strictly static',
        'Equilibrium constant $K_c$ decreases',
      ],
      correctIdx: 0,
      solutionText:
        'When $Q_c < K_c$, product concentration is below equilibrium ratio, driving the net reaction forward until $Q_c = K_c$.',
      numericalAnswer: '1',
    },
    {
      questionText:
        'In {chapter} organic reactivity, which carbocation intermediate is most stabilized by hyperconjugation?',
      options: [
        'Tertiary $(CH_3)_3C^+$ (9 α-H)',
        'Secondary $(CH_3)_2CH^+$ (6 α-H)',
        'Primary $CH_3CH_2^+$ (3 α-H)',
        'Methyl $CH_3^+$ (0 α-H)',
      ],
      correctIdx: 0,
      solutionText:
        'More $\\alpha$-hydrogens provide greater hyperconjugative delocalization + $+I$ stabilization: $3^\\circ > 2^\\circ > 1^\\circ > \\text{methyl}$.',
      numericalAnswer: '9',
    },
    {
      questionText:
        'In {chapter} stoichiometry, the number of moles of $O_2$ required for complete combustion of $2\\text{ mol}$ of methane ($CH_4 + 2O_2 \\to CO_2 + 2H_2O$) is:',
      options: ['4 mol', '2 mol', '1 mol', '6 mol'],
      correctIdx: 0,
      solutionText:
        '1 mol $CH_4$ requires 2 mol $O_2$, so 2 mol $CH_4$ requires $2 \\times 2 = 4\\text{ mol}$ of $O_2$.',
      numericalAnswer: '4',
    },
  ],
  Mathematics: [
    {
      questionText:
        'In {chapter}, if the roots of $x^2 - 7x + 12 = 0$ are $\\alpha$ and $\\beta$, then $\\alpha^2 + \\beta^2$ equals:',
      options: ['25', '49', '13', '37'],
      correctIdx: 0,
      solutionText:
        '$\\alpha + \\beta = 7$ and $\\alpha\\beta = 12$. Therefore $\\alpha^2 + \\beta^2 = (\\alpha + \\beta)^2 - 2\\alpha\\beta = 49 - 24 = 25$.',
      numericalAnswer: '25',
    },
    {
      questionText:
        'In {chapter}, the value of the definite integral $\\int_0^{\\pi/2} \\frac{\\cos x}{\\sin x + \\cos x}\\,dx$ is:',
      options: ['π / 4', 'π / 2', '1', '0'],
      correctIdx: 0,
      solutionText:
        'By King’s rule $x \\mapsto \\pi/2 - x$, $2I = \\int_0^{\\pi/2} 1\\,dx = \\pi/2 \\implies I = \\pi/4$.',
      numericalAnswer: '4',
    },
    {
      questionText:
        'In {chapter}, if $f(x) = x^3 - 3x^2 + 4$, the local minimum value of $f(x)$ occurs at $x = 2$ and equals:',
      options: ['0', '4', '-2', '2'],
      correctIdx: 0,
      solutionText:
        '$f\'(x) = 3x(x - 2) = 0$ at $x = 0, 2$; $f\'\'(2) = 6 > 0$ (local min), and $f(2) = 8 - 12 + 4 = 0$.',
      numericalAnswer: '0',
    },
    {
      questionText:
        'In {chapter}, the number of ways to select a committee of 3 students from 6 candidates is $\\binom{6}{3} =$:',
      options: ['20', '15', '18', '120'],
      correctIdx: 0,
      solutionText:
        '$\\binom{6}{3} = \\frac{6 \\times 5 \\times 4}{3 \\times 2 \\times 1} = 20$.',
      numericalAnswer: '20',
    },
    {
      questionText:
        'In {chapter}, the shortest distance from origin $(0,0)$ to the line $3x + 4y - 15 = 0$ is:',
      options: ['3 units', '5 units', '15 units', '4 units'],
      correctIdx: 0,
      solutionText:
        '$d = \\frac{|3(0) + 4(0) - 15|}{\\sqrt{3^2 + 4^2}} = \\frac{15}{5} = 3\\text{ units}$.',
      numericalAnswer: '3',
    },
  ],
  Biology: [
    {
      questionText:
        'In {chapter} (NCERT High-Yield), which organelle is semi-autonomous and contains its own 70S ribosomes and circular DNA?',
      options: ['Mitochondria & Chloroplast', 'Golgi Apparatus', 'Lysosome', 'Peroxisome'],
      correctIdx: 0,
      solutionText:
        'Both mitochondria and chloroplasts possess circular DNA and 70S prokaryotic-type ribosomes.',
      numericalAnswer: '70',
    },
    {
      questionText:
        'In {chapter}, during cell division, crossing over between non-sister chromatids of homologous chromosomes occurs in:',
      options: ['Pachytene of Prophase I', 'Zygotene of Prophase I', 'Metaphase II', 'Anaphase I'],
      correctIdx: 0,
      solutionText:
        'Recombination nodules form and recombinase mediates crossing over during the Pachytene substage of Prophase I.',
      numericalAnswer: '1',
    },
    {
      questionText:
        'In {chapter}, the enzyme responsible for synthesizing RNA from a DNA template during transcription is:',
      options: ['DNA-dependent RNA polymerase', 'RNA-dependent DNA polymerase', 'DNA ligase', 'Topoisomerase'],
      correctIdx: 0,
      solutionText:
        'DNA-dependent RNA polymerase catalyzes polymerization strictly in the $5\' \\to 3\'$ direction using the $3\' \\to 5\'$ template strand.',
      numericalAnswer: '5',
    },
    {
      questionText:
        'In {chapter}, how many ATP and NADPH molecules are required in the Calvin Cycle to fix 1 molecule of $CO_2$?',
      options: ['3 ATP and 2 NADPH', '2 ATP and 3 NADPH', '18 ATP and 12 NADPH', '1 ATP and 1 NADPH'],
      correctIdx: 0,
      solutionText:
        'Fixing 1 $CO_2$ requires 3 ATP and 2 NADPH (so 1 glucose = 6 $CO_2$ takes 18 ATP and 12 NADPH).',
      numericalAnswer: '3',
    },
    {
      questionText:
        'In {chapter}, the standard Mendelian dihybrid phenotypic ratio in the $F_2$ generation is:',
      options: ['9 : 3 : 3 : 1', '3 : 1', '1 : 2 : 1', '1 : 1 : 1 : 1'],
      correctIdx: 0,
      solutionText:
        'Independent assortment of two heterozygous traits yields the classic $9 : 3 : 3 : 1$ phenotypic ratio.',
      numericalAnswer: '9',
    },
  ],
};

function synthesizeQuestionForSubject(
  subjectName: string,
  chapterName: string,
  templateIndex: number,
  questionNumber: number,
  testId: string,
  asNumerical: boolean,
  difficultyLabel: string
): TestQuestionRecord {
  const bank = SUBJECT_CURATED_TEMPLATES[subjectName] ?? SUBJECT_CURATED_TEMPLATES.Physics;
  const tpl = bank[templateIndex % bank.length];
  const cleanChapter = chapterName.trim() || `${subjectName} Core Concepts`;
  const prompt = tpl.questionText.replace(/\{chapter\}/g, cleanChapter);

  return {
    id: `${testId}-gen-q-${questionNumber}`,
    testId,
    questionNumber,
    subjectName,
    chapterName: cleanChapter,
    questionType: asNumerical ? 'integer' : 'single-mcq',
    questionText: `[${difficultyLabel}] ${prompt}`,
    optionTexts: asNumerical ? [] : [...tpl.options],
    correctOptionIndices: asNumerical ? undefined : [tpl.correctIdx],
    numericalAnswer: asNumerical ? tpl.numericalAnswer ?? '4' : undefined,
    solutionText: tpl.solutionText,
    positiveMarks: 4,
    negativeMarks: asNumerical ? 0 : 1,
    testStatus: 'published',
  };
}

/**
 * Builds a balanced Custom Mock Test (10, 25, 45, 75, or 180 Qs) across selected subjects,
 * prioritizing real question bank entries + weak chapters in AI Balanced mode, and filling
 * cleanly with zero-cost curated KaTeX questions when a subject pool is smaller than needed.
 */
export function buildBalancedCustomMock(
  request: BalancedMockRequest,
  allBankQuestions: TestQuestionRecord[]
): BalancedMockSummary {
  const quotas = computeBalancedSubjectQuota(request.questionCount, request.subjects);
  const weakSet = new Set((request.weakChapters ?? []).map((c) => c.toLowerCase()));
  const chapterFilter = new Set((request.chapters ?? []).map((c) => c.toLowerCase()));
  const testId = `custom-${request.aiBalanced ? 'ai-balanced' : 'manual'}-${request.questionCount}q-${Date.now()}`;

  const builtQuestions: TestQuestionRecord[] = [];
  const durationMinutes =
    request.questionCount === 10
      ? 20
      : request.questionCount === 25
        ? 50
        : request.questionCount === 45
          ? 90
          : request.questionCount === 75
            ? 180
            : 200;

  let qNum = 1;
  for (const { subject, count } of quotas) {
    let subPool = allBankQuestions.filter((q) => {
      if (q.subjectName.toLowerCase() !== subject.toLowerCase()) return false;
      if (chapterFilter.size > 0 && q.chapterName && !chapterFilter.has(q.chapterName.toLowerCase())) {
        return false;
      }
      return true;
    });

    if (request.aiBalanced && weakSet.size > 0) {
      // Prioritize weak chapters from student's mistake history first
      subPool = [...subPool].sort((a, b) => {
        const aWeak = a.chapterName && weakSet.has(a.chapterName.toLowerCase()) ? 0 : 1;
        const bWeak = b.chapterName && weakSet.has(b.chapterName.toLowerCase()) ? 0 : 1;
        return aWeak - bWeak;
      });
    }

    const natQuota = request.examType === 'JEE Main' && count >= 10 ? Math.max(1, Math.floor(count * 0.2)) : 0;

    for (let i = 0; i < count; i += 1) {
      const wantNat = natQuota > 0 && i >= count - natQuota;
      const base = subPool[i];
      if (base) {
        builtQuestions.push({
          ...base,
          id: `${testId}-q-${qNum}-${base.id}`,
          testId,
          questionNumber: qNum,
          subjectName: subject,
          questionType: wantNat ? 'integer' : base.questionType,
          numericalAnswer: wantNat ? base.numericalAnswer || '5' : base.numericalAnswer,
        });
      } else {
        const chosenChapter =
          request.chapters && request.chapters.length > 0
            ? request.chapters[i % request.chapters.length]
            : `${subject} High-Yield`;
        builtQuestions.push(
          synthesizeQuestionForSubject(
            subject,
            chosenChapter,
            i,
            qNum,
            testId,
            wantNat,
            request.aiBalanced ? 'AI Balanced' : 'Custom Mock'
          )
        );
      }
      qNum += 1;
    }
  }

  const labelMode = request.aiBalanced ? 'AI Balanced' : 'Custom';
  const test: MockTestRecord = {
    id: testId,
    title: `${labelMode} ${request.questionCount}Q Mock (${request.examType} · ${quotas.map((q) => q.subject.slice(0, 3)).join('/')})`,
    slug: `custom-${request.questionCount}q-${Date.now()}`,
    destination: 'cbt-mock',
    cohortId: request.examType === 'NEET UG' ? 'class-12-neet' : 'class-12-jee',
    examCategory: `${request.examType} ${labelMode} Builder`,
    examType: request.examType,
    totalQuestions: builtQuestions.length,
    totalMarks: builtQuestions.length * 4,
    durationMinutes,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
    syllabus: quotas.map((q) => ({
      subject: q.subject,
      chapters:
        request.chapters && request.chapters.length > 0
          ? request.chapters
          : [`Balanced ${q.subject} (${q.count} Qs)`],
    })),
    instructions: getDefaultExamInstructions({
      examType: request.examType,
      durationMinutes,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      totalQuestions: builtQuestions.length,
    }),
    createdAtIso: new Date().toISOString(),
  };

  return {
    test,
    questions: builtQuestions,
    subjectBreakdown: quotas,
  };
}

/**
 * Generates an instant, zero-cost tailored Chapter DPP practice set for ANY chapter.
 */
export function generateTailoredChapterDpp(
  request: GenerateDppRequest,
  allBankQuestions: TestQuestionRecord[]
): GeneratedDppBundle {
  const testId = `gen-dpp-${Date.now()}`;
  const cleanChapter = request.chapterName.trim() || `${request.subjectName} Essentials`;
  const lowerChapter = cleanChapter.toLowerCase();
  const lowerSubject = request.subjectName.toLowerCase();

  const exactChapterPool = allBankQuestions.filter(
    (q) =>
      q.subjectName.toLowerCase() === lowerSubject &&
      q.chapterName &&
      q.chapterName.toLowerCase().includes(lowerChapter.split(' ')[0])
  );

  const builtQuestions: TestQuestionRecord[] = [];
  const natCount = request.includeNumerical ? Math.max(2, Math.floor(request.questionCount * 0.2)) : 0;

  for (let i = 0; i < request.questionCount; i += 1) {
    const wantNat = natCount > 0 && i >= request.questionCount - natCount;
    const matched = exactChapterPool[i];
    if (matched && !wantNat) {
      builtQuestions.push({
        ...matched,
        id: `${testId}-q-${i + 1}`,
        testId,
        questionNumber: i + 1,
        chapterName: cleanChapter,
      });
    } else {
      builtQuestions.push(
        synthesizeQuestionForSubject(
          request.subjectName,
          cleanChapter,
          i,
          i + 1,
          testId,
          wantNat,
          request.difficulty
        )
      );
    }
  }

  const durationMinutes = Math.max(15, Math.round(request.questionCount * 2));
  const isNeet = String(request.cohortId).includes('neet');

  const test: MockTestRecord = {
    id: testId,
    title: `${cleanChapter} — Tailored DPP (${request.questionCount}Q · ${request.difficulty})`,
    slug: `dpp-${cleanChapter.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    destination: 'dpp',
    cohortId: request.cohortId,
    cohortIds: [request.cohortId],
    subjectId: request.subjectId,
    chapterId: request.chapterId,
    examCategory: `${request.subjectName} Chapter DPP`,
    examType: isNeet ? 'NEET UG' : 'JEE Main',
    totalQuestions: builtQuestions.length,
    totalMarks: builtQuestions.length * 4,
    durationMinutes,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
    syllabus: [{ subject: request.subjectName, chapters: [cleanChapter] }],
    createdAtIso: new Date().toISOString(),
  };

  return { test, questions: builtQuestions };
}

export function loadSavedGeneratedDpps(): GeneratedDppBundle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GENERATED_DPPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GeneratedDppBundle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGeneratedDppBundle(bundle: GeneratedDppBundle): GeneratedDppBundle[] {
  const existing = loadSavedGeneratedDpps().filter((b) => b.test.id !== bundle.test.id);
  const next = [bundle, ...existing].slice(0, 12);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(GENERATED_DPPS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }
  return next;
}
