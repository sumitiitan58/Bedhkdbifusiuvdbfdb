import type {
  AdminSupportRequest,
  BlueprintQuestionItem,
  ChatThreadRecord,
  DifficultyTier,
  SupportRequestCategory,
  SupportRequestStatus,
} from '../utils/chatHistoryLogic';
import {
  createInitialEmpireState,
  type EmpireSaveState,
} from '../utils/empireBuilderLogic';

const CHAT_THREADS_PREFIX = 'prepskm_chat_threads_v2_';
const SUPPORT_INBOX_KEY = 'prepskm_admin_support_inbox_v1';
const SHARED_BANK_KEY = 'prepskm_shared_question_bank_v1';
const EMPIRE_STATE_PREFIX = 'prepskm_empire_state_v1_';
const APEX_PROFILE_PREFIX = 'prepskm_apex_profile_v1_';

export const BLUEPRINT_SYNC_EVENT = 'prepskm-blueprint-sync';

export interface ApexProfileSyncState {
  empireCoins: number;
  empireAreaSqFt: number;
  bestCyberLabRank: 'S' | 'A' | 'B' | null;
  bestKhandaharLevelCleared: number;
  formulaRunnerBestScore: number;
  towerDefenseBestWave: number;
  conceptsMastered: string[];
  updatedAtIso: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(BLUEPRINT_SYNC_EVENT, { detail: { key } }));
  } catch {
    // ignore quota errors
  }
}

// ==========================================
// 1. PERSISTENT CHAT HISTORY THREADS
// ==========================================
export function loadChatThreads(userScope: string): ChatThreadRecord[] {
  const rows = readJson<ChatThreadRecord[]>(`${CHAT_THREADS_PREFIX}${userScope}`, []);
  return Array.isArray(rows) ? rows : [];
}

export function saveChatThreads(userScope: string, threads: ChatThreadRecord[]): void {
  writeJson(`${CHAT_THREADS_PREFIX}${userScope}`, threads.slice(0, 60));
}

// ==========================================
// 2. DIRECT ADMIN SUPPORT & FEATURE INBOX
// ==========================================
const SEED_SUPPORT_REQUESTS: AdminSupportRequest[] = [
  {
    id: 'sup-seed-1',
    category: 'Formula Sheet',
    subject: 'Chemistry',
    examTrack: 'JEE Main',
    summary: 'Add Electrochemistry & Nernst quick revision sheet',
    details: 'Need a compact 1-page formula sheet covering Nernst equation, Kohlrausch law, and conductance graphs.',
    studentName: 'Aarav Sharma',
    studentEmail: 'aarav.jee@prepskm.in',
    status: 'Open',
    createdAtIso: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    updatedAtIso: new Date(Date.now() - 86_400_000 * 2).toISOString(),
  },
  {
    id: 'sup-seed-2',
    category: 'Feature / Game Suggestion',
    subject: 'Physics',
    examTrack: 'JEE Advanced',
    summary: 'Add Ray Optics mirror numericals to Empire Builder Palda battles',
    details: 'Would love more mirror/lens magnification numericals when fighting rival empires above 500 sq. ft.',
    studentName: 'Riya Verma',
    studentEmail: 'riya.prep@prepskm.in',
    status: 'In Review',
    createdAtIso: new Date(Date.now() - 86_400_000).toISOString(),
    updatedAtIso: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

export function loadSupportRequests(): AdminSupportRequest[] {
  const saved = readJson<AdminSupportRequest[] | null>(SUPPORT_INBOX_KEY, null);
  if (!saved) return SEED_SUPPORT_REQUESTS;
  return Array.isArray(saved) ? saved : SEED_SUPPORT_REQUESTS;
}

export function submitSupportRequest(input: {
  category: SupportRequestCategory;
  subject: string;
  examTrack: string;
  summary: string;
  details: string;
  studentName: string;
  studentEmail: string;
}): AdminSupportRequest {
  const now = new Date().toISOString();
  const nextItem: AdminSupportRequest = {
    id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: input.category,
    subject: input.subject.trim() || 'General',
    examTrack: input.examTrack.trim() || 'JEE Main',
    summary: input.summary.trim(),
    details: input.details.trim(),
    studentName: input.studentName.trim() || 'PREPSKM Student',
    studentEmail: input.studentEmail.trim() || 'student@prepskm.in',
    status: 'Open',
    createdAtIso: now,
    updatedAtIso: now,
  };
  const current = loadSupportRequests();
  writeJson(SUPPORT_INBOX_KEY, [nextItem, ...current].slice(0, 120));
  return nextItem;
}

export function updateSupportRequestStatus(
  id: string,
  status: SupportRequestStatus
): AdminSupportRequest[] {
  const now = new Date().toISOString();
  const next = loadSupportRequests().map((item) =>
    item.id === id ? { ...item, status, updatedAtIso: now } : item
  );
  writeJson(SUPPORT_INBOX_KEY, next);
  return next;
}

export function deleteSupportRequest(id: string): AdminSupportRequest[] {
  const next = loadSupportRequests().filter((item) => item.id !== id);
  writeJson(SUPPORT_INBOX_KEY, next);
  return next;
}

// ==========================================
// 3. SHARED ADMIN -> PORTAL & APEX ARENA QUESTION BANK
// ==========================================
export const STARTER_BLUEPRINT_QUESTIONS: BlueprintQuestionItem[] = [
  {
    id: 'bpq-1',
    questionNumber: 1,
    examTrack: 'JEE Main',
    subjectName: 'Physics',
    chapterName: 'Electrostatics',
    difficultyTier: 'Easy',
    questionType: 'single-mcq',
    questionText: 'According to Gauss Law, the total electric flux Φ through a closed surface enclosing charge q in vacuum is:',
    optionTexts: ['q / ε₀', 'q · ε₀', 'q / (4πε₀)', '4πq / ε₀'],
    correctOptionIndices: [0],
    solutionText: 'Gauss Law states Φ = ∮ E·dA = q_enclosed / ε₀.',
    publishedTargets: ['dpp', 'cbt-mock', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-2',
    questionNumber: 2,
    examTrack: 'JEE Main',
    subjectName: 'Chemistry',
    chapterName: 'Chemical Bonding',
    difficultyTier: 'Easy',
    questionType: 'single-mcq',
    questionText: 'The hybridization and molecular geometry of XeF₄ are respectively:',
    optionTexts: ['sp³d², Square Planar', 'sp³d, See-Saw', 'sp³, Tetrahedral', 'sp³d², Octahedral'],
    correctOptionIndices: [0],
    solutionText: 'XeF₄ has 4 bond pairs and 2 lone pairs (steric number 6 → sp³d²), giving a square planar shape.',
    publishedTargets: ['dpp', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-3',
    questionNumber: 3,
    examTrack: 'JEE Main',
    subjectName: 'Mathematics',
    chapterName: 'Definite Integration',
    difficultyTier: 'Moderate',
    questionType: 'single-mcq',
    questionText: 'The value of ∫₀^(π/2) sin²(x) dx is:',
    optionTexts: ['π / 2', 'π / 4', '1 / 2', 'π / 8'],
    correctOptionIndices: [1],
    solutionText: 'Using King’s property I = ∫₀^(π/2) cos²x dx, so 2I = ∫₀^(π/2) 1 dx = π/2 ⇒ I = π/4.',
    publishedTargets: ['cbt-mock', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-4',
    questionNumber: 4,
    examTrack: 'JEE Main',
    subjectName: 'Physics',
    chapterName: 'Rotational Motion',
    difficultyTier: 'Moderate',
    questionType: 'single-mcq',
    questionText: 'The moment of inertia of a uniform solid sphere of mass M and radius R about its diameter is:',
    optionTexts: ['(2/5) MR²', '(2/3) MR²', '(1/2) MR²', '(7/5) MR²'],
    correctOptionIndices: [0],
    solutionText: 'For a solid sphere about a diameter, I = (2/5)MR² (while a hollow shell has (2/3)MR²).',
    publishedTargets: ['dpp', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-5',
    questionNumber: 5,
    examTrack: 'JEE Advanced',
    subjectName: 'Chemistry',
    chapterName: 'Chemical Kinetics',
    difficultyTier: 'Hard',
    questionType: 'single-mcq',
    questionText: 'For a first-order reaction, the time required for 75% completion compared to its half-life t₁/₂ is:',
    optionTexts: ['1.5 t₁/₂', '2 t₁/₂', '3 t₁/₂', '4 t₁/₂'],
    correctOptionIndices: [1],
    solutionText: 'After 1 half-life 50% remains; after 2 half-lives 25% remains (75% completed).',
    publishedTargets: ['cbt-mock', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-6',
    questionNumber: 6,
    examTrack: 'JEE Advanced',
    subjectName: 'Physics',
    chapterName: 'Modern Physics',
    difficultyTier: 'Hard',
    questionType: 'single-mcq',
    questionText: 'If the kinetic energy of a free electron is quadrupled (4×), its de Broglie wavelength becomes:',
    optionTexts: ['Half (λ/2)', 'Double (2λ)', 'One-fourth (λ/4)', 'Unchanged'],
    correctOptionIndices: [0],
    solutionText: 'λ = h / √(2mK). Quadrupling K doubles √K, so λ becomes λ/2.',
    publishedTargets: ['cbt-mock', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-7',
    questionNumber: 7,
    examTrack: 'JEE Advanced',
    subjectName: 'Mathematics',
    chapterName: 'Complex Numbers',
    difficultyTier: 'Very Hard',
    questionType: 'single-mcq',
    questionText: 'If ω is a non-real cube root of unity, then the value of (1 + ω − ω²)³ − (1 − ω + ω²)³ is:',
    optionTexts: ['0', '−16', '16', '−8'],
    correctOptionIndices: [0],
    solutionText: 'Since 1+ω = −ω², first term is (−2ω²)³ = −8ω⁶ = −8. Second term is (−2ω)³ = −8ω³ = −8. Difference = 0.',
    publishedTargets: ['cbt-mock', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-8',
    questionNumber: 8,
    examTrack: 'NEET',
    subjectName: 'Chemistry',
    chapterName: 'Redox Reactions',
    difficultyTier: 'Very Hard',
    questionType: 'single-mcq',
    questionText: 'The oxidation number of Chromium in butterfly-shaped peroxide CrO₅ is:',
    optionTexts: ['+10', '+6', '+4', '+3'],
    correctOptionIndices: [1],
    solutionText: 'CrO₅ has two peroxide bridges (−1 each × 4 O) and one double-bonded O (−2), yielding Cr = +6.',
    publishedTargets: ['dpp', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-9',
    questionNumber: 9,
    examTrack: 'JEE Main',
    subjectName: 'Physics',
    chapterName: 'Ray Optics',
    difficultyTier: 'Moderate',
    questionType: 'single-mcq',
    questionText: 'An equiconvex lens of refractive index 1.5 has focal length f in air. If immersed in water (n = 4/3), its focal length becomes:',
    optionTexts: ['2f', '4f', 'f / 2', '3f'],
    correctOptionIndices: [1],
    solutionText: 'f_w / f_a = (1.5 − 1) / (1.5/(4/3) − 1) = 0.5 / (1.125 − 1) = 0.5 / 0.125 = 4 ⇒ f_w = 4f.',
    publishedTargets: ['cbt-mock', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'bpq-10',
    questionNumber: 10,
    examTrack: 'JEE Main',
    subjectName: 'Chemistry',
    chapterName: 'Organic Named Reactions',
    difficultyTier: 'Easy',
    questionType: 'single-mcq',
    questionText: 'Which aldehyde undergoes the Cannizzaro reaction with concentrated NaOH?',
    optionTexts: ['Benzaldehyde (PhCHO)', 'Acetaldehyde (CH₃CHO)', 'Propanal', 'Acetone'],
    correctOptionIndices: [0],
    solutionText: 'Cannizzaro reaction occurs exclusively in aldehydes lacking α-hydrogen atoms, such as HCHO and PhCHO.',
    publishedTargets: ['dpp', 'apex-arena'],
    createdAtIso: '2026-11-01T00:00:00.000Z',
  },
];

export function loadBlueprintQuestions(): BlueprintQuestionItem[] {
  const custom = readJson<BlueprintQuestionItem[]>(SHARED_BANK_KEY, []);
  const customList = Array.isArray(custom) ? custom : [];
  return [...customList, ...STARTER_BLUEPRINT_QUESTIONS];
}

export function loadCustomBlueprintQuestions(): BlueprintQuestionItem[] {
  const custom = readJson<BlueprintQuestionItem[]>(SHARED_BANK_KEY, []);
  return Array.isArray(custom) ? custom : [];
}

export function publishBlueprintQuestions(items: BlueprintQuestionItem[]): BlueprintQuestionItem[] {
  const existing = loadCustomBlueprintQuestions();
  const existingIds = new Set(existing.map((q) => q.id));
  const merged = [
    ...items.filter((q) => !existingIds.has(q.id)),
    ...existing,
  ].slice(0, 400);
  writeJson(SHARED_BANK_KEY, merged);
  return merged;
}

export function deleteBlueprintQuestion(id: string): BlueprintQuestionItem[] {
  const next = loadCustomBlueprintQuestions().filter((q) => q.id !== id);
  writeJson(SHARED_BANK_KEY, next);
  return next;
}

export function pickArenaQuestion(
  difficulty?: DifficultyTier,
  subjectFilter?: string,
  excludeIds: string[] = []
): BlueprintQuestionItem {
  const all = loadBlueprintQuestions().filter((q) =>
    q.publishedTargets.includes('apex-arena') &&
    q.optionTexts.length >= 2 &&
    q.correctOptionIndices.length > 0
  );
  const excludeSet = new Set(excludeIds);
  let candidates = all.filter((q) => !excludeSet.has(q.id));
  if (candidates.length === 0) candidates = all;

  if (subjectFilter) {
    const bySubject = candidates.filter(
      (q) => q.subjectName.toLowerCase() === subjectFilter.toLowerCase()
    );
    if (bySubject.length > 0) candidates = bySubject;
  }

  if (difficulty) {
    const byDiff = candidates.filter((q) => q.difficultyTier === difficulty);
    if (byDiff.length > 0) candidates = byDiff;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick ?? STARTER_BLUEPRINT_QUESTIONS[0];
}

// ==========================================
// 4. EMPIRE BUILDER & CROSS-PLATFORM APEX SYNC
// ==========================================
export function loadEmpireProgress(userScope: string): EmpireSaveState {
  const saved = readJson<EmpireSaveState | null>(`${EMPIRE_STATE_PREFIX}${userScope}`, null);
  if (!saved || typeof saved.areaSqFt !== 'number') {
    return createInitialEmpireState('prepsbot-prime', 'PrepsKM');
  }
  return {
    ...createInitialEmpireState(saved.avatarId ?? 'prepsbot-prime', saved.playerNameTag ?? 'PrepsKM'),
    ...saved,
  };
}

export function saveEmpireProgress(userScope: string, state: EmpireSaveState): void {
  writeJson(`${EMPIRE_STATE_PREFIX}${userScope}`, state);
  const profile = loadApexProfileStats(userScope);
  saveApexProfileStats(userScope, {
    ...profile,
    empireCoins: state.coins,
    empireAreaSqFt: state.areaSqFt,
  });
}

export function loadApexProfileStats(userScope: string): ApexProfileSyncState {
  return readJson<ApexProfileSyncState>(`${APEX_PROFILE_PREFIX}${userScope}`, {
    empireCoins: 120,
    empireAreaSqFt: 10,
    bestCyberLabRank: null,
    bestKhandaharLevelCleared: 0,
    formulaRunnerBestScore: 0,
    towerDefenseBestWave: 0,
    conceptsMastered: [],
    updatedAtIso: new Date().toISOString(),
  });
}

export function saveApexProfileStats(userScope: string, patch: Partial<ApexProfileSyncState>): ApexProfileSyncState {
  const current = loadApexProfileStats(userScope);
  const mergedConcepts = Array.from(
    new Set([...current.conceptsMastered, ...(patch.conceptsMastered ?? [])])
  ).slice(0, 60);
  const rankOrder = { S: 3, A: 2, B: 1 } as const;
  let bestRank = current.bestCyberLabRank;
  if (patch.bestCyberLabRank) {
    if (!bestRank || rankOrder[patch.bestCyberLabRank] > rankOrder[bestRank]) {
      bestRank = patch.bestCyberLabRank;
    }
  }
  const next: ApexProfileSyncState = {
    ...current,
    ...patch,
    bestCyberLabRank: bestRank,
    bestKhandaharLevelCleared: Math.max(
      current.bestKhandaharLevelCleared,
      patch.bestKhandaharLevelCleared ?? 0
    ),
    formulaRunnerBestScore: Math.max(
      current.formulaRunnerBestScore,
      patch.formulaRunnerBestScore ?? 0
    ),
    towerDefenseBestWave: Math.max(
      current.towerDefenseBestWave,
      patch.towerDefenseBestWave ?? 0
    ),
    conceptsMastered: mergedConcepts,
    updatedAtIso: new Date().toISOString(),
  };
  writeJson(`${APEX_PROFILE_PREFIX}${userScope}`, next);
  return next;
}
