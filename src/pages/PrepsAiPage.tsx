import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Image as ImageIcon,
  LifeBuoy,
  Loader2,
  Menu,
  MessageSquare,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Presentation,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { SeoHead } from '../components/SeoHead';
import {
  TutorWorkspaceStudio,
  type TutorStudioMode,
} from '../components/ai/TutorWorkspaceStudio';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import {
  requestEducationalDiagram,
  requestPrepsAiChat,
} from '../services/geminiClient';
import {
  loadChatThreads,
  saveChatThreads,
  submitSupportRequest,
} from '../services/blueprintStore';
import {
  appendMessageToThread,
  createEmptyChatThread,
  sanitizeEducationalSvg,
  shouldGenerateDiagram,
  sortThreadsByRecent,
  type ChatDiagramAsset,
  type ChatMessageItem,
  type ChatModeId,
  type ChatThreadRecord,
  type SupportRequestCategory,
} from '../utils/chatHistoryLogic';
import {
  detectTutorResponseLanguage,
  findPrecedingUserQuestion,
} from '../utils/tutorLanguagePolicy';
import {
  buildPrepsAiStudentContext,
  computeExamCountdown,
  computeStudyStreak,
} from '../utils/streakTracker';
import { computePrepScore } from '../utils/prepScoreEngine';
import { extractMistakeEntries } from '../utils/testAnalysisEngine';
import {
  STARTER_KEEP_NOTES,
  type KeepStudyNote,
  type SheetPerformanceAnalysis,
} from '../utils/sheetTutorAnalyzer';
import { playAiSparkle, playClick, playSuccess } from '../utils/soundEffects';

const KEEP_NOTES_STORAGE_KEY = 'prepskm_keep_notes_v1';

const STARTER_PROMPTS = [
  {
    title: 'Draw a Free-Body Diagram',
    prompt: 'Draw a free-body diagram of a block of mass m sliding down a rough inclined plane of angle θ.',
    wantsDiagram: true,
  },
  {
    title: 'Organic Reaction Mechanism',
    prompt: 'Draw the diagram and explain Aldol Condensation of acetaldehyde step by step for JEE Main.',
    wantsDiagram: true,
  },
  {
    title: '7-Day Weak Chapter Plan',
    prompt: 'Create a focused 7-day weak chapter revision plan based on my recent test accuracy and pacing.',
    wantsDiagram: false,
  },
  {
    title: 'Cut Negative Marks',
    prompt: 'Give me 4 actionable rules to reduce negative marking in JEE/NEET physics numericals.',
    wantsDiagram: false,
  },
];

const MODE_OPTIONS: Array<{
  id: ChatModeId;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}> = [
  {
    id: 'mentor',
    label: 'AI Study Mentor',
    description: 'Personalized JEE/NEET strategy & concept clarity',
    icon: Sparkles,
  },
  {
    id: 'doubt-solver',
    label: 'Doubt Solver',
    description: 'Step-by-step Physics, Chemistry & Math derivations',
    icon: MessageSquare,
  },
  {
    id: 'sheets',
    label: 'Analytical Assistant',
    description: 'Analyze Google Sheets & mock score trends',
    icon: FileSpreadsheet,
  },
  {
    id: 'learning-path',
    label: 'Learning Path',
    description: 'Structured chapter roadmap & Keep notes',
    icon: BookOpen,
  },
  {
    id: 'practice',
    label: 'Practice Quiz',
    description: 'Generate custom targeted exam questions',
    icon: HelpCircle,
  },
];

function loadSavedKeepNotes(): KeepStudyNote[] {
  try {
    const raw = window.localStorage.getItem(KEEP_NOTES_STORAGE_KEY);
    if (!raw) return STARTER_KEEP_NOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KeepStudyNote[]) : STARTER_KEEP_NOTES;
  } catch {
    return STARTER_KEEP_NOTES;
  }
}

/**
 * Deterministic textbook-grade SVG diagram fallback when live AI diagram API is unreachable.
 * Ensures visual educational requests always render clean, labeled scientific illustrations.
 */
function buildFallbackScientificDiagram(prompt: string): ChatDiagramAsset {
  const lower = prompt.toLowerCase();
  if (/incline|wedge|fbd|free[- ]?body|pulley|friction|force|block/.test(lower)) {
    return {
      title: 'Free-Body Diagram — Block on Rough Inclined Plane',
      subject: 'Physics',
      caption: 'Forces resolved along and perpendicular to an incline of angle θ.',
      concepts: ['Normal Reaction (N = mg cos θ)', 'Gravity Component (mg sin θ)', 'Kinetic Friction (f = μN)'],
      svgMarkup: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="360" rx="14" fill="#0f172a"/>
        <polygon points="90,300 540,300 540,120" fill="#1e293b" stroke="#475569" stroke-width="2"/>
        <text x="155" y="290" fill="#94a3b8" font-size="15" font-weight="700">θ</text>
        <g transform="translate(330,192) rotate(-21.8)">
          <rect x="-42" y="-34" width="84" height="52" rx="6" fill="#2563eb" fill-opacity="0.35" stroke="#38bdf8" stroke-width="2.5"/>
          <text x="0" y="-3" text-anchor="middle" fill="#f8fafc" font-size="16" font-weight="800">m</text>
          <line x1="0" y1="-34" x2="0" y2="-112" stroke="#34d399" stroke-width="3"/>
          <polygon points="0,-122 -7,-107 7,-107" fill="#34d399"/>
          <text x="12" y="-96" fill="#34d399" font-size="14" font-weight="700">N = mg cos θ</text>
          <line x1="42" y1="-8" x2="122" y2="-8" stroke="#f59e0b" stroke-width="3"/>
          <polygon points="132,-8 117,-15 117,-1" fill="#f59e0b"/>
          <text x="72" y="-18" fill="#f59e0b" font-size="13" font-weight="700">f = μN</text>
          <line x1="-42" y1="-8" x2="-122" y2="-8" stroke="#f43f5e" stroke-width="3"/>
          <polygon points="-132,-8 -117,-15 -117,-1" fill="#f43f5e"/>
          <text x="-126" y="-20" fill="#f43f5e" font-size="13" font-weight="700">mg sin θ</text>
        </g>
        <line x1="330" y1="205" x2="330" y2="305" stroke="#e2e8f0" stroke-width="2.5" stroke-dasharray="6 4"/>
        <polygon points="330,315 323,300 337,300" fill="#e2e8f0"/>
        <text x="342" y="294" fill="#e2e8f0" font-size="14" font-weight="700">mg (Weight)</text>
        <text x="24" y="34" fill="#f8fafc" font-size="15" font-weight="800">Free-Body Diagram: Block on Rough Incline</text>
        <text x="24" y="54" fill="#94a3b8" font-size="12">a = g(sin θ − μ cos θ)</text>
      </svg>`,
    };
  }
  if (/aldol|organic|benzene|reaction|chemistry|flask|lab|apparatus/.test(lower)) {
    return {
      title: 'Aldol Condensation Mechanism (Base-Catalyzed)',
      subject: 'Chemistry',
      caption: 'Enolate formation, nucleophilic attack on carbonyl carbon, and β-hydroxy aldehyde dehydration.',
      concepts: ['α-Hydrogen Acidity', 'Enolate Nucleophile', 'α,β-Unsaturated Carbonyl'],
      svgMarkup: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="360" rx="14" fill="#0f172a"/>
        <text x="24" y="34" fill="#f8fafc" font-size="15" font-weight="800">Aldol Condensation Pathway (2 CH₃CHO)</text>
        <rect x="28" y="88" width="155" height="72" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
        <text x="105" y="118" text-anchor="middle" fill="#e0f2fe" font-size="14" font-weight="700">CH₃–CHO</text>
        <text x="105" y="142" text-anchor="middle" fill="#94a3b8" font-size="11">+ dil. NaOH (−H⁺)</text>
        <line x1="188" y1="124" x2="238" y2="124" stroke="#34d399" stroke-width="2.5"/>
        <polygon points="246,124 234,118 234,130" fill="#34d399"/>
        <rect x="250" y="88" width="155" height="72" rx="10" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
        <text x="327" y="118" text-anchor="middle" fill="#a7f3d0" font-size="14" font-weight="700">⁻CH₂–CHO</text>
        <text x="327" y="142" text-anchor="middle" fill="#94a3b8" font-size="11">Resonance Enolate</text>
        <line x1="410" y1="124" x2="456" y2="124" stroke="#fbbf24" stroke-width="2.5"/>
        <polygon points="464,124 452,118 452,130" fill="#fbbf24"/>
        <rect x="468" y="88" width="146" height="72" rx="10" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
        <text x="541" y="116" text-anchor="middle" fill="#fef3c7" font-size="12.5" font-weight="700">CH₃CH(OH)CH₂CHO</text>
        <text x="541" y="140" text-anchor="middle" fill="#fbbf24" font-size="11">β-Hydroxy Aldehyde</text>
        <line x1="541" y1="166" x2="541" y2="218" stroke="#f472b6" stroke-width="2.5"/>
        <polygon points="541,226 535,214 547,214" fill="#f472b6"/>
        <text x="556" y="200" fill="#f472b6" font-size="12" font-weight="700">Δ (−H₂O)</text>
        <rect x="220" y="232" width="380" height="72" rx="10" fill="#1e293b" stroke="#f472b6" stroke-width="2.2"/>
        <text x="410" y="264" text-anchor="middle" fill="#fbcfe8" font-size="15" font-weight="800">CH₃–CH=CH–CHO (Crotonaldehyde)</text>
        <text x="410" y="286" text-anchor="middle" fill="#94a3b8" font-size="11.5">Conjugated α,β-Unsaturated Aldehyde (Major Product)</text>
      </svg>`,
    };
  }
  return {
    title: `Concept Diagram: ${prompt.slice(0, 44)}`,
    subject: 'Science',
    caption: 'Visual study schematic summarizing core relationships and exam checkpoints.',
    concepts: ['Core Principle', 'Formula Relationship', 'Exam Application'],
    svgMarkup: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="360" rx="14" fill="#0f172a"/>
      <text x="28" y="38" fill="#f8fafc" font-size="15" font-weight="800">Visual Concept Map — PrepsKM Study Engine</text>
      <circle cx="320" cy="184" r="64" fill="#1e3a8a" fill-opacity="0.5" stroke="#38bdf8" stroke-width="2.5"/>
      <text x="320" y="180" text-anchor="middle" fill="#f8fafc" font-size="13" font-weight="800">Core Concept</text>
      <text x="320" y="198" text-anchor="middle" fill="#38bdf8" font-size="11">Fundamental Law</text>
      <line x1="256" y1="184" x2="150" y2="120" stroke="#34d399" stroke-width="2"/>
      <rect x="36" y="88" width="136" height="58" rx="10" fill="#1e293b" stroke="#34d399" stroke-width="1.8"/>
      <text x="104" y="114" text-anchor="middle" fill="#a7f3d0" font-size="12" font-weight="700">Boundary Conditions</text>
      <text x="104" y="132" text-anchor="middle" fill="#94a3b8" font-size="10">Assumptions &amp; Units</text>
      <line x1="384" y1="184" x2="486" y2="120" stroke="#fbbf24" stroke-width="2"/>
      <rect x="468" y="88" width="136" height="58" rx="10" fill="#1e293b" stroke="#fbbf24" stroke-width="1.8"/>
      <text x="536" y="114" text-anchor="middle" fill="#fef3c7" font-size="12" font-weight="700">Governing Formula</text>
      <text x="536" y="132" text-anchor="middle" fill="#94a3b8" font-size="10">Vector / Scalar Form</text>
      <line x1="320" y1="248" x2="320" y2="282" stroke="#c084fc" stroke-width="2"/>
      <rect x="196" y="284" width="248" height="50" rx="10" fill="#1e293b" stroke="#c084fc" stroke-width="1.8"/>
      <text x="320" y="314" text-anchor="middle" fill="#e9d5ff" font-size="12.5" font-weight="700">JEE / NEET High-Yield Application</text>
    </svg>`,
  };
}

function downloadSvgDiagram(diagram: ChatDiagramAsset) {
  const safeSvg = sanitizeEducationalSvg(diagram.svgMarkup);
  if (!safeSvg) return;
  const blob = new Blob([safeSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${diagram.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'prepskm-diagram'}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PrepsAiPage() {
  const location = useLocation();
  const { profile, firebaseUser, cohortId } = useAuth();
  const {
    allCohorts,
    attempts,
    chapters,
    questions,
    activeStudyDates,
    targetExamDate,
    bookmarkedQuestionIds,
    resolvedMistakeIds,
  } = usePlatformData();
  const { openLiveTeacher } = usePrepskm2();

  const userScope = firebaseUser?.uid ?? 'guest';

  // Persistent Chat Threads Sidebar
  const [threads, setThreads] = useState<ChatThreadRecord[]>(() => {
    const saved = loadChatThreads(userScope);
    if (saved.length > 0) return sortThreadsByRecent(saved);
    return [createEmptyChatThread('mentor')];
  });
  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    const saved = loadChatThreads(userScope);
    return saved[0]?.id ?? '';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Active Mode (consolidated inside compact dot menu)
  const [activeMode, setActiveMode] = useState<ChatModeId>('mentor');
  const [menuOpen, setMenuOpen] = useState(false);
  const [diagramMode, setDiagramMode] = useState(false);

  // Direct Admin Support Modal
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState<SupportRequestCategory>('Missing Chapter');
  const [supportSubject, setSupportSubject] = useState('Physics');
  const [supportTrack, setSupportTrack] = useState('JEE Main');
  const [supportSummary, setSupportSummary] = useState('');
  const [supportDetails, setSupportDetails] = useState('');
  const [supportSubmittedBanner, setSupportSubmittedBanner] = useState<string | null>(null);

  // Studio data (for Sheets Analyzer / Learning Path / Practice Quiz when selected via dot menu)
  const [sheetAnalysis, setSheetAnalysis] = useState<SheetPerformanceAnalysis | null>(null);
  const [keepNotes, setKeepNotes] = useState<KeepStudyNote[]>(() => loadSavedKeepNotes());

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reload user-scoped chat threads on login/logout
  useEffect(() => {
    const saved = loadChatThreads(userScope);
    if (saved.length > 0) {
      const sorted = sortThreadsByRecent(saved);
      setThreads(sorted);
      setActiveThreadId(sorted[0].id);
    } else {
      const fresh = createEmptyChatThread('mentor');
      setThreads([fresh]);
      setActiveThreadId(fresh.id);
    }
  }, [userScope]);

  // Ensure activeThreadId always points to a valid thread
  const activeThread = useMemo(() => {
    const found = threads.find((t) => t.id === activeThreadId);
    return found ?? threads[0] ?? createEmptyChatThread('mentor');
  }, [threads, activeThreadId]);

  useEffect(() => {
    if (threads.length > 0) {
      saveChatThreads(userScope, threads);
    }
  }, [threads, userScope]);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEEP_NOTES_STORAGE_KEY, JSON.stringify(keepNotes));
    } catch {
      // ignore
    }
  }, [keepNotes]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (activeThread.messages.length === 0 && !loading) return;
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeThread.messages.length, loading]);

  const cohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'Class 12 JEE',
    [allCohorts, cohortId]
  );

  const studentName = profile?.displayName || firebaseUser?.displayName || 'Student';
  const studentEmail = profile?.email || firebaseUser?.email || 'student@prepskm.in';
  const streak = useMemo(() => computeStudyStreak(activeStudyDates), [activeStudyDates]);
  const countdown = useMemo(() => computeExamCountdown(targetExamDate), [targetExamDate]);

  const unresolvedMistakesCount = useMemo(() => {
    const resolvedSet = new Set(resolvedMistakeIds);
    return extractMistakeEntries(attempts, questions).filter(
      (m) => !resolvedSet.has(m.questionId)
    ).length;
  }, [attempts, questions, resolvedMistakeIds]);

  const prepScore = useMemo(
    () =>
      computePrepScore({
        attempts,
        questions,
        chapters,
        activeStudyDates,
        resolvedMistakeIds,
        cohortLabel,
      }),
    [attempts, questions, chapters, activeStudyDates, resolvedMistakeIds, cohortLabel]
  );

  const studentContext = useMemo(
    () => ({
      ...buildPrepsAiStudentContext({
        studentName,
        cohortLabel,
        attempts,
        currentStreakDays: streak.currentStreak,
        targetExamDaysLeft: countdown.daysRemaining,
        bookmarkedQuestionsCount: bookmarkedQuestionIds.length,
        unresolvedMistakesCount,
      }),
      prepScore: prepScore.score,
      prepTier: prepScore.tier,
      activeMode,
    }),
    [
      activeMode,
      attempts,
      bookmarkedQuestionIds.length,
      cohortLabel,
      countdown.daysRemaining,
      prepScore.score,
      prepScore.tier,
      streak.currentStreak,
      studentName,
      unresolvedMistakesCount,
    ]
  );

  const handleNewChat = useCallback(() => {
    playClick();
    const fresh = createEmptyChatThread(
      activeMode === 'doubt-solver' ? 'doubt-solver' : 'mentor'
    );
    setThreads((prev) => sortThreadsByRecent([fresh, ...prev]));
    setActiveThreadId(fresh.id);
    if (activeMode !== 'mentor' && activeMode !== 'doubt-solver') {
      setActiveMode('mentor');
    }
    setMobileDrawerOpen(false);
    setError('');
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [activeMode]);

  const handleDeleteThread = useCallback(
    (id: string) => {
      playClick();
      setThreads((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        if (remaining.length === 0) {
          const fresh = createEmptyChatThread('mentor');
          setActiveThreadId(fresh.id);
          return [fresh];
        }
        if (activeThreadId === id) {
          setActiveThreadId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeThreadId]
  );

  const handleSend = useCallback(
    async (overrideText?: string, forceDiagram?: boolean) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;

      playClick();
      setError('');
      setInput('');
      setLoading(true);

      const currentThreadId = activeThread.id;
      const userMsg: ChatMessageItem = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        text,
        createdAtIso: new Date().toISOString(),
        mode: activeMode,
      };

      const historySnapshot = activeThread.messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      setThreads((prev) =>
        sortThreadsByRecent(
          prev.map((t) =>
            t.id === currentThreadId ? appendMessageToThread(t, userMsg) : t
          )
        )
      );

      const wantsDiagram = shouldGenerateDiagram(text, Boolean(forceDiagram ?? diagramMode));
      const detectedLang = detectTutorResponseLanguage(text);

      try {
        const chatPromise = requestPrepsAiChat({
          message: text,
          history: historySnapshot,
          studentContext: {
            ...studentContext,
            preferredLanguage: detectedLang,
          },
          voiceMode: false,
        });
        const guardedChatPromise = wantsDiagram
          ? Promise.race([
              chatPromise,
              new Promise<never>((_, reject) =>
                window.setTimeout(() => reject(new Error('diagram-chat-timeout')), 6000)
              ),
            ])
          : chatPromise;

        const [chatRes, diagramRes] = await Promise.allSettled([
          guardedChatPromise,
          wantsDiagram
            ? requestEducationalDiagram({
                prompt: text,
                subject: cohortLabel,
              })
            : Promise.resolve(null),
        ]);

        let replyText = '';
        let providerLabel: string | undefined;
        if (chatRes.status === 'fulfilled') {
          replyText = chatRes.value.reply;
          providerLabel = chatRes.value.provider;
        } else if (wantsDiagram) {
          replyText = `Here is your labeled study diagram for "${text}". Review the key concept checkpoints below and save the diagram for quick revision.`;
        } else {
          throw chatRes.reason;
        }

        let diagramAsset: ChatDiagramAsset | undefined;
        if (wantsDiagram) {
          if (diagramRes.status === 'fulfilled' && diagramRes.value?.diagram) {
            const safeSvg = sanitizeEducationalSvg(diagramRes.value.diagram.svgMarkup);
            diagramAsset = safeSvg
              ? { ...diagramRes.value.diagram, svgMarkup: safeSvg }
              : buildFallbackScientificDiagram(text);
          } else {
            diagramAsset = buildFallbackScientificDiagram(text);
          }
        }

        const assistantMsg: ChatMessageItem = {
          id: `msg-a-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          createdAtIso: new Date().toISOString(),
          diagram: diagramAsset,
          mode: activeMode,
          provider: providerLabel,
        };

        setThreads((prev) =>
          sortThreadsByRecent(
            prev.map((t) =>
              t.id === currentThreadId ? appendMessageToThread(t, assistantMsg) : t
            )
          )
        );
        if (diagramMode) setDiagramMode(false);
        playAiSparkle();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to reach Preps AI right now.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [activeMode, activeThread.id, activeThread.messages, cohortLabel, diagramMode, input, loading, studentContext]
  );

  // Pick up route prompt if navigated from another page
  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt && activeThread.messages.length === 0) {
      void handleSend(state.initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSummary.trim()) return;
    submitSupportRequest({
      category: supportCategory,
      subject: supportSubject,
      examTrack: supportTrack,
      summary: supportSummary,
      details: supportDetails || supportSummary,
      studentName,
      studentEmail,
    });
    playSuccess();
    setSupportSummary('');
    setSupportDetails('');
    setSupportModalOpen(false);
    setSupportSubmittedBanner(
      'Your request was sent directly to the PrepsKM Admin Support Inbox.'
    );
    window.setTimeout(() => setSupportSubmittedBanner(null), 5000);
  };

  const isStudioMode =
    activeMode === 'sheets' || activeMode === 'learning-path' || activeMode === 'practice';

  const activeModeLabel =
    MODE_OPTIONS.find((m) => m.id === activeMode)?.label ?? 'AI Study Mentor';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/95 border-r border-slate-200/80 dark:border-slate-800">
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="new-chat-btn"
          onClick={handleNewChat}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
        <button
          type="button"
          onClick={() => {
            setSidebarOpen(false);
            setMobileDrawerOpen(false);
          }}
          aria-label="Collapse chat history sidebar"
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3.5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Chat History
      </div>

      <div data-testid="chat-history-list" className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {threads.map((thread) => {
          const isActive = thread.id === activeThread.id;
          return (
            <div
              key={thread.id}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
              }`}
              onClick={() => {
                setActiveThreadId(thread.id);
                if (isStudioMode) setActiveMode('mentor');
                setMobileDrawerOpen(false);
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate leading-snug">{thread.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                  {thread.messages.length} msgs ·{' '}
                  {new Date(thread.updatedAtIso).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              {threads.length > 1 && (
                <button
                  type="button"
                  aria-label={`Delete ${thread.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteThread(thread.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setSupportModalOpen(true);
            setMobileDrawerOpen(false);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <LifeBuoy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Contact Admin / Request Chapter
        </button>
      </div>
    </div>
  );

  return (
    <PageLayout hideFooter>
      <SeoHead
        title="Preps AI — Study Mentor & Visual Diagram Assistant | prepskm.in"
        description="Distraction-free Gemini-style AI study mentor with persistent chat history, inline scientific diagrams, and direct JEE/NEET support."
        canonicalPath="/preps-ai"
      />

      <div className="flex h-[calc(100vh-4.25rem)] bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 overflow-hidden relative">
        {/* Desktop Collapsible Left Sidebar */}
        {sidebarOpen && (
          <aside className="hidden lg:block w-72 shrink-0 h-full">
            {sidebarContent}
          </aside>
        )}

        {/* Mobile Slide-Out Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="w-72 max-w-[85vw] h-full shadow-2xl">{sidebarContent}</div>
            <div
              className="flex-1 bg-slate-950/50"
              onClick={() => setMobileDrawerOpen(false)}
            />
          </div>
        )}

        {/* Main Minimalist Workspace */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Ultra-Minimal Top Bar (zero clutter cards, zero voice/telemetry ribbons) */}
          <header className="h-14 shrink-0 px-4 sm:px-6 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open chat history"
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Expand chat history sidebar"
                  className="hidden lg:inline-flex p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-display font-bold text-base tracking-tight truncate">
                  Preps AI
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                  / {activeModeLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isStudioMode && (
                <button
                  type="button"
                  onClick={() => setActiveMode('mentor')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Back to Chat
                </button>
              )}
            </div>
          </header>

          {supportSubmittedBanner && (
            <div className="mx-auto mt-3 max-w-2xl px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {supportSubmittedBanner}
            </div>
          )}

          {/* Secondary Studio Mode (only when explicitly chosen from compact dot menu) */}
          {isStudioMode ? (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="max-w-5xl mx-auto">
                <TutorWorkspaceStudio
                  activeTab={activeMode as Exclude<TutorStudioMode, 'chat'>}
                  studentName={studentName}
                  cohortLabel={cohortLabel}
                  keepNotes={keepNotes}
                  onAddKeepNote={(note) =>
                    setKeepNotes((prev) => [
                      { ...note, id: `keep-${Date.now()}`, updatedAtIso: new Date().toISOString() },
                      ...prev,
                    ])
                  }
                  onDeleteKeepNote={(id) =>
                    setKeepNotes((prev) => prev.filter((n) => n.id !== id))
                  }
                  sheetAnalysis={sheetAnalysis}
                  onSheetAnalysisChange={setSheetAnalysis}
                  onOpenChatWithPrompt={(promptText: string) => {
                    setActiveMode('mentor');
                    void handleSend(promptText);
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Clean Conversational Thread Area */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {activeThread.messages.length === 0 ? (
                    <div className="pt-8 sm:pt-14 pb-6">
                      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Hello, {studentName.split(' ')[0]}
                      </h1>
                      <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                        Ask any JEE, NEET, or Board concept doubt, request a labeled scientific diagram, or plan your next study sprint.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                        {STARTER_PROMPTS.map((item) => (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() => void handleSend(item.prompt, item.wantsDiagram)}
                            className="text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/70 transition cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {item.title}
                              </span>
                              {item.wantsDiagram && (
                                <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                              {item.prompt}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    activeThread.messages.map((msg, msgIdx) => {
                      const isUser = msg.role === 'user';
                      const pairedUserQuestion = isUser
                        ? msg.text
                        : findPrecedingUserQuestion(
                            activeThread.messages,
                            msgIdx,
                            msg.text.slice(0, 160)
                          );
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[90%] sm:max-w-[82%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                              isUser
                                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                                : 'bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{msg.text}</div>

                            {/* Inline Generated Educational Diagram */}
                            {msg.diagram && (
                              <div
                                data-testid="inline-chat-diagram"
                                className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950"
                              >
                                <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-white truncate">
                                      {msg.diagram.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {msg.diagram.caption}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => downloadSvgDiagram(msg.diagram!)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium shrink-0 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Save SVG
                                  </button>
                                </div>
                                <div
                                  className="w-full p-2"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeEducationalSvg(msg.diagram.svgMarkup),
                                  }}
                                />
                                {msg.diagram.concepts.length > 0 && (
                                  <div className="px-3.5 py-2 bg-slate-900/80 border-t border-slate-800 flex flex-wrap gap-2">
                                    {msg.diagram.concepts.map((c) => (
                                      <span
                                        key={c}
                                        className="text-[11px] font-mono text-sky-300"
                                      >
                                        • {c}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Clean solution whiteboard trigger bound strictly to THIS exact message pair */}
                            {!isUser && (
                              <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  data-testid={`open-whiteboard-msg-${msgIdx}`}
                                  onClick={() =>
                                    openLiveTeacher({
                                      questionText: pairedUserQuestion,
                                      subjectName: cohortLabel,
                                      solutionText: msg.text,
                                      preferredLanguage: detectTutorResponseLanguage(pairedUserQuestion),
                                      source: 'preps-ai',
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  <Presentation className="w-3.5 h-3.5" />
                                  Open Step-by-Step Whiteboard
                                </button>
                                <span className="text-[11px] text-slate-400 tabular-nums">
                                  {new Date(msg.createdAtIso).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {loading && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400 px-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>
                        {diagramMode
                          ? 'Generating explanation & labeled diagram...'
                          : 'Thinking...'}
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Minimalist Bottom Composer with Compact Gemini-Style Dot Menu */}
              <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2 bg-white dark:bg-[#0B0F19]">
                <div className="max-w-3xl mx-auto">
                  {diagramMode && (
                    <div className="mb-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Visual Diagram Mode enabled for next message
                      </span>
                      <button
                        type="button"
                        onClick={() => setDiagramMode(false)}
                        className="hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSend();
                    }}
                    className="relative flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 focus-within:border-blue-500 transition shadow-sm"
                  >
                    {/* Compact Gemini-Style Dot Menu */}
                    <div ref={menuRef} className="relative">
                      <button
                        type="button"
                        data-testid="chat-dot-menu-btn"
                        onClick={() => setMenuOpen((o) => !o)}
                        aria-label="Open tools, modes, and admin support menu"
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {menuOpen && (
                        <div
                          data-testid="chat-dot-menu-popover"
                          className="absolute bottom-12 left-0 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-2 z-40"
                        >
                          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Switch Mode
                          </div>
                          {MODE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const selected = activeMode === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setActiveMode(opt.id);
                                  setMenuOpen(false);
                                }}
                                className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
                                  selected
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold">{opt.label}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {opt.description}
                                  </div>
                                </div>
                              </button>
                            );
                          })}

                          <div className="my-1.5 border-t border-slate-200 dark:border-slate-800" />

                          <button
                            type="button"
                            data-testid="toggle-diagram-mode-btn"
                            onClick={() => {
                              setDiagramMode((d) => !d);
                              setMenuOpen(false);
                              inputRef.current?.focus();
                            }}
                            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                            {diagramMode ? 'Disable Visual Diagram' : 'Generate Scientific Diagram'}
                          </button>

                          <button
                            type="button"
                            data-testid="open-admin-support-btn"
                            onClick={() => {
                              setMenuOpen(false);
                              setSupportModalOpen(true);
                            }}
                            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <LifeBuoy className="w-4 h-4 text-emerald-500" />
                            Direct Admin Support / Request Feature
                          </button>
                        </div>
                      )}
                    </div>

                    <input
                      ref={inputRef}
                      data-testid="preps-ai-input"
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        diagramMode
                          ? 'Describe the diagram to draw (e.g. FBD, Benzene mechanism, Cell)...'
                          : 'Ask Preps AI a question, doubt, or diagram...'
                      }
                      className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none py-1.5"
                    />

                    <button
                      type="submit"
                      data-testid="preps-ai-send-btn"
                      disabled={loading || !input.trim()}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition cursor-pointer shrink-0"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Direct Admin Support & Feature Request Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div
            data-testid="admin-support-modal"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  Direct Admin Support &amp; Requests
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Report a missing chapter, formula sheet, bug, or Apex Arena game idea directly to the PrepsKM Admin Inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupport} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Request Type
                  </label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value as SupportRequestCategory)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="Missing Chapter">Missing Chapter</option>
                    <option value="Formula Sheet">Formula Sheet</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature / Game Suggestion">Feature / Game Suggestion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Exam Track
                  </label>
                  <select
                    value={supportTrack}
                    onChange={(e) => setSupportTrack(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="JEE Main">JEE Main</option>
                    <option value="JEE Advanced">JEE Advanced</option>
                    <option value="NEET">NEET</option>
                    <option value="Class 9-12">Class 9–12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="Physics, Chemistry, Mathematics, Biology..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Short Summary
                </label>
                <input
                  required
                  data-testid="support-summary-input"
                  type="text"
                  value={supportSummary}
                  onChange={(e) => setSupportSummary(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="e.g. Add Wave Optics Young Double Slit formula sheet"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Details
                </label>
                <textarea
                  rows={3}
                  value={supportDetails}
                  onChange={(e) => setSupportDetails(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="Include specific chapter names, exam years, or issue steps..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="support-submit-btn"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                >
                  Send to Admin Inbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
