import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  computeEloUpdate,
  createInitialArenaProgression,
  getTodayIsoDate,
  type ArenaProgressionState,
  type EloSubjectKey,
} from '../utils/arenaProgression';
import type { MasteryStageKey } from '../data/prepskm2Data';
import {
  getLevelFromXp,
  type MistakeErrorTag,
  type XpLevelProgress,
} from '../utils/prepskm2Upgrades';
import type { LiveTeacherLessonRequest } from '../utils/liveTeacherEngine';
import { useAuth } from './AuthContext';

export interface PrepsBotVictoryEvent {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
}

export interface MentorshipPassRecord {
  token: string;
  mentorId: string;
  mentorName: string;
  mentorCollege: string;
  durationMinutes: number;
  amountInr: number;
  upiRef: string;
  issuedAtIso: string;
  status: 'Active' | 'Used';
}

export interface BacklogTaskItem {
  id: string;
  title: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  dueDateIso: string;
  bucket: 'present' | 'backlog';
  completed: boolean;
}

interface Prepskm2ContextValue {
  progression: ArenaProgressionState;
  recordArenaGameResult: (params: {
    gameName: string;
    subject: EloSubjectKey;
    score: number;
    accuracyRatio: number;
    maxCombo: number;
    xpEarned: number;
    difficultyRating?: number;
  }) => { eloDelta: number; newRating: number };
  recordFocusBlockVerified: (minutes: number, focusBreaks: number) => void;
  recordPyqSprintProgress: (questionsSolved: number) => void;
  masteryMap: Record<string, Record<MasteryStageKey, boolean>>;
  toggleMasteryStage: (chapterId: string, stage: MasteryStageKey) => void;
  backlogTasks: BacklogTaskItem[];
  addBacklogTask: (task: Omit<BacklogTaskItem, 'id' | 'completed'>) => void;
  toggleBacklogTask: (id: string) => void;
  rescheduleBacklogToPresent: (id: string) => void;
  deleteBacklogTask: (id: string) => void;
  zenMode: boolean;
  setZenMode: (open: boolean) => void;
  toggleZenMode: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  pendingCopilotPrompt: string | null;
  clearPendingCopilotPrompt: () => void;
  openCopilotWithPrompt: (prompt: string) => void;
  mentorshipPasses: MentorshipPassRecord[];
  addMentorshipPass: (pass: MentorshipPassRecord) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  levelProgress: XpLevelProgress;
  prepsbotVictory: PrepsBotVictoryEvent | null;
  triggerPrepsBotVictory: (payload: Omit<PrepsBotVictoryEvent, 'id'>) => void;
  clearPrepsBotVictory: () => void;
  mistakeErrorTags: Record<string, MistakeErrorTag>;
  setMistakeErrorTag: (questionId: string, tag: MistakeErrorTag | null) => void;
  liveTeacherRequest: LiveTeacherLessonRequest | null;
  openLiveTeacher: (request: LiveTeacherLessonRequest) => void;
  closeLiveTeacher: () => void;
}

const Prepskm2Context = createContext<Prepskm2ContextValue | null>(null);

const PROGRESSION_KEY_PREFIX = 'prepskm2_progression_v1_';
const MASTERY_KEY_PREFIX = 'prepskm2_mastery_v1_';
const PASSES_KEY_PREFIX = 'prepskm2_passes_v1_';
const BACKLOG_KEY_PREFIX = 'prepskm2_backlog_v1_';
const MISTAKE_TAGS_KEY_PREFIX = 'prepskm2_mistake_tags_v1_';

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
  } catch {
    // ignore quota errors
  }
}

function makeDefaultBacklogTasks(): BacklogTaskItem[] {
  const today = getTodayIsoDate();
  return [
    {
      id: 'bt-1',
      title: 'Electrostatics Gauss Law — 15 PYQs (2021–2025)',
      subject: 'Physics',
      dueDateIso: today,
      bucket: 'present',
      completed: false,
    },
    {
      id: 'bt-2',
      title: 'Aldehydes & Ketones — Named Reaction Chain Sheet',
      subject: 'Chemistry',
      dueDateIso: today,
      bucket: 'present',
      completed: false,
    },
    {
      id: 'bt-3',
      title: 'Rotational Dynamics — Rolling Motion Backlog DPP',
      subject: 'Physics',
      dueDateIso: today,
      bucket: 'backlog',
      completed: false,
    },
    {
      id: 'bt-4',
      title: 'Ionic Equilibrium — Buffer & Solubility Numericals',
      subject: 'Chemistry',
      dueDateIso: today,
      bucket: 'backlog',
      completed: false,
    },
  ];
}

export function Prepskm2Provider({ children }: { children: ReactNode }) {
  const { firebaseUser } = useAuth();
  const userScope = firebaseUser?.uid ?? 'guest';

  const progKey = `${PROGRESSION_KEY_PREFIX}${userScope}`;
  const masteryKey = `${MASTERY_KEY_PREFIX}${userScope}`;
  const passesKey = `${PASSES_KEY_PREFIX}${userScope}`;
  const backlogKey = `${BACKLOG_KEY_PREFIX}${userScope}`;
  const mistakeTagsKey = `${MISTAKE_TAGS_KEY_PREFIX}${userScope}`;

  const [progression, setProgression] = useState<ArenaProgressionState>(() => {
    const saved = readJson<ArenaProgressionState | null>(progKey, null);
    const today = getTodayIsoDate();
    if (!saved) return createInitialArenaProgression(today);
    if (saved.trifecta?.dateIso !== today) {
      return {
        ...saved,
        trifecta: {
          dateIso: today,
          pyqsOrTestDone: false,
          focusBlockDone: false,
          arenaOrMistakesDone: false,
          pyqsSolvedToday: 0,
          focusMinutesToday: 0,
          arenaWinsToday: 0,
        },
      };
    }
    return saved;
  });

  const [masteryMap, setMasteryMap] = useState<Record<string, Record<MasteryStageKey, boolean>>>(() =>
    readJson<Record<string, Record<MasteryStageKey, boolean>>>(masteryKey, {})
  );

  const [mentorshipPasses, setMentorshipPasses] = useState<MentorshipPassRecord[]>(() =>
    readJson<MentorshipPassRecord[]>(passesKey, [])
  );

  const [backlogTasks, setBacklogTasks] = useState<BacklogTaskItem[]>(() =>
    readJson<BacklogTaskItem[]>(backlogKey, makeDefaultBacklogTasks())
  );

  const [mistakeErrorTags, setMistakeErrorTags] = useState<Record<string, MistakeErrorTag>>(() =>
    readJson<Record<string, MistakeErrorTag>>(mistakeTagsKey, {})
  );

  const [zenMode, setZenMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [pendingCopilotPrompt, setPendingCopilotPrompt] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [prepsbotVictory, setPrepsbotVictory] = useState<PrepsBotVictoryEvent | null>(null);
  const [liveTeacherRequest, setLiveTeacherRequest] = useState<LiveTeacherLessonRequest | null>(null);

  const openLiveTeacher = useCallback((request: LiveTeacherLessonRequest) => {
    setCopilotOpen(false);
    setLiveTeacherRequest(request);
  }, []);

  const closeLiveTeacher = useCallback(() => {
    setLiveTeacherRequest(null);
  }, []);

  const levelProgress = useMemo(() => getLevelFromXp(progression.seasonXp), [progression.seasonXp]);
  const prevLevelRef = useRef<number>(levelProgress.level);
  const prevScopeRef = useRef<string>(userScope);

  const triggerPrepsBotVictory = useCallback((payload: Omit<PrepsBotVictoryEvent, 'id'>) => {
    setPrepsbotVictory({
      ...payload,
      id: Date.now(),
    });
  }, []);

  const clearPrepsBotVictory = useCallback(() => {
    setPrepsbotVictory(null);
  }, []);

  // Automatically celebrate whenever the student crosses a new XP level
  useEffect(() => {
    if (prevScopeRef.current !== userScope) {
      prevScopeRef.current = userScope;
      prevLevelRef.current = levelProgress.level;
      return;
    }
    if (levelProgress.level > prevLevelRef.current) {
      triggerPrepsBotVictory({
        title: `Level ${levelProgress.level} Unlocked!`,
        subtitle: `${progression.seasonXp.toLocaleString('en-IN')} Season XP reached — PrepsBot salutes your consistency!`,
        badge: 'LEVEL UP',
      });
    }
    prevLevelRef.current = levelProgress.level;
  }, [levelProgress.level, progression.seasonXp, triggerPrepsBotVictory, userScope]);

  // Sync user scope on login/logout
  useEffect(() => {
    const savedProg = readJson<ArenaProgressionState | null>(progKey, null);
    const today = getTodayIsoDate();
    if (savedProg) {
      setProgression(
        savedProg.trifecta?.dateIso === today
          ? savedProg
          : {
              ...savedProg,
              trifecta: {
                dateIso: today,
                pyqsOrTestDone: false,
                focusBlockDone: false,
                arenaOrMistakesDone: false,
                pyqsSolvedToday: 0,
                focusMinutesToday: 0,
                arenaWinsToday: 0,
              },
            }
      );
    } else {
      setProgression(createInitialArenaProgression(today));
    }
    setMasteryMap(readJson<Record<string, Record<MasteryStageKey, boolean>>>(masteryKey, {}));
    setMentorshipPasses(readJson<MentorshipPassRecord[]>(passesKey, []));
    setBacklogTasks(readJson<BacklogTaskItem[]>(backlogKey, makeDefaultBacklogTasks()));
    setMistakeErrorTags(readJson<Record<string, MistakeErrorTag>>(mistakeTagsKey, {}));
  }, [progKey, masteryKey, passesKey, backlogKey, mistakeTagsKey]);

  // Global Cmd+K / Ctrl+K listener & Escape for Zen Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandPaletteOpen]);

  const recordArenaGameResult = useCallback(
    (params: {
      gameName: string;
      subject: EloSubjectKey;
      score: number;
      accuracyRatio: number;
      maxCombo: number;
      xpEarned: number;
      difficultyRating?: number;
    }) => {
      let computedResult = { eloDelta: 0, newRating: 1000 };
      setProgression((prev) => {
        const currentRating = prev.elo[params.subject] ?? 1000;
        const { newRating, delta } = computeEloUpdate(
          currentRating,
          params.accuracyRatio,
          params.difficultyRating ?? 1100
        );
        computedResult = { eloDelta: delta, newRating };
        const speedUpdate =
          params.subject === 'speedArena'
            ? { newRating, delta }
            : computeEloUpdate(prev.elo.speedArena, params.accuracyRatio, 1080, 16);

        const nextTrifecta = {
          ...prev.trifecta,
          dateIso: getTodayIsoDate(),
          arenaWinsToday: prev.trifecta.arenaWinsToday + 1,
          arenaOrMistakesDone: true,
        };

        const wasComplete =
          prev.trifecta.pyqsOrTestDone &&
          prev.trifecta.focusBlockDone &&
          prev.trifecta.arenaOrMistakesDone;
        const isNowComplete =
          nextTrifecta.pyqsOrTestDone &&
          nextTrifecta.focusBlockDone &&
          nextTrifecta.arenaOrMistakesDone;

        const next: ArenaProgressionState = {
          ...prev,
          seasonXp: prev.seasonXp + Math.max(10, Math.round(params.xpEarned)),
          streakShields: prev.streakShields + (!wasComplete && isNowComplete ? 1 : 0),
          elo: {
            ...prev.elo,
            [params.subject]: newRating,
            speedArena: speedUpdate.newRating,
          },
          gamesPlayed: prev.gamesPlayed + 1,
          bestCombo: Math.max(prev.bestCombo, params.maxCombo),
          trifecta: nextTrifecta,
          recentHistory: [
            {
              id: `ar-${Date.now()}`,
              gameName: params.gameName,
              subject: params.subject,
              score: params.score,
              xpEarned: Math.max(10, Math.round(params.xpEarned)),
              eloDelta: delta,
              playedAtIso: new Date().toISOString(),
            },
            ...prev.recentHistory,
          ].slice(0, 20),
        };
        writeJson(progKey, next);
        return next;
      });
      return computedResult;
    },
    [progKey]
  );

  const recordFocusBlockVerified = useCallback(
    (minutes: number, focusBreaks: number) => {
      setProgression((prev) => {
        const addedMins = Math.max(1, Math.round(minutes));
        const totalMins = prev.trifecta.focusMinutesToday + addedMins;
        const xpBonus = Math.max(20, addedMins * 2 - focusBreaks * 5);
        const nextTrifecta = {
          ...prev.trifecta,
          dateIso: getTodayIsoDate(),
          focusMinutesToday: totalMins,
          focusBlockDone: prev.trifecta.focusBlockDone || totalMins >= 25,
        };
        const next: ArenaProgressionState = {
          ...prev,
          seasonXp: prev.seasonXp + xpBonus,
          trifecta: nextTrifecta,
        };
        writeJson(progKey, next);
        return next;
      });
    },
    [progKey]
  );

  const recordPyqSprintProgress = useCallback(
    (questionsSolved: number) => {
      setProgression((prev) => {
        const solved = prev.trifecta.pyqsSolvedToday + Math.max(1, questionsSolved);
        const next: ArenaProgressionState = {
          ...prev,
          seasonXp: prev.seasonXp + questionsSolved * 5,
          trifecta: {
            ...prev.trifecta,
            dateIso: getTodayIsoDate(),
            pyqsSolvedToday: solved,
            pyqsOrTestDone: prev.trifecta.pyqsOrTestDone || solved >= 15,
          },
        };
        writeJson(progKey, next);
        return next;
      });
    },
    [progKey]
  );

  const toggleMasteryStage = useCallback(
    (chapterId: string, stage: MasteryStageKey) => {
      setMasteryMap((prev) => {
        const cur = prev[chapterId] ?? {
          theory: false,
          dpp: false,
          pyqs: false,
          rev1: false,
          rev2: false,
        };
        const next = {
          ...prev,
          [chapterId]: {
            ...cur,
            [stage]: !cur[stage],
          },
        };
        writeJson(masteryKey, next);
        return next;
      });
    },
    [masteryKey]
  );

  const addBacklogTask = useCallback(
    (task: Omit<BacklogTaskItem, 'id' | 'completed'>) => {
      setBacklogTasks((prev) => {
        const next: BacklogTaskItem[] = [
          { ...task, id: `bt-${Date.now()}`, completed: false },
          ...prev,
        ].slice(0, 60);
        writeJson(backlogKey, next);
        return next;
      });
    },
    [backlogKey]
  );

  const toggleBacklogTask = useCallback(
    (id: string) => {
      setBacklogTasks((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
        writeJson(backlogKey, next);
        return next;
      });
    },
    [backlogKey]
  );

  const rescheduleBacklogToPresent = useCallback(
    (id: string) => {
      const today = getTodayIsoDate();
      setBacklogTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, bucket: 'present' as const, dueDateIso: today } : t
        );
        writeJson(backlogKey, next);
        return next;
      });
    },
    [backlogKey]
  );

  const deleteBacklogTask = useCallback(
    (id: string) => {
      setBacklogTasks((prev) => {
        const next = prev.filter((t) => t.id !== id);
        writeJson(backlogKey, next);
        return next;
      });
    },
    [backlogKey]
  );

  const addMentorshipPass = useCallback(
    (pass: MentorshipPassRecord) => {
      setMentorshipPasses((prev) => {
        const next = [pass, ...prev].slice(0, 30);
        writeJson(passesKey, next);
        return next;
      });
    },
    [passesKey]
  );

  const openCopilotWithPrompt = useCallback((prompt: string) => {
    setPendingCopilotPrompt(prompt);
    setCopilotOpen(true);
  }, []);

  const clearPendingCopilotPrompt = useCallback(() => {
    setPendingCopilotPrompt(null);
  }, []);

  const setMistakeErrorTag = useCallback(
    (questionId: string, tag: MistakeErrorTag | null) => {
      setMistakeErrorTags((prev) => {
        const next = { ...prev };
        if (!tag || next[questionId] === tag) {
          delete next[questionId];
        } else {
          next[questionId] = tag;
        }
        writeJson(mistakeTagsKey, next);
        return next;
      });
    },
    [mistakeTagsKey]
  );

  const toggleZenMode = useCallback(() => setZenMode((z) => !z), []);
  const toggleSidebarCollapsed = useCallback(() => setSidebarCollapsed((c) => !c), []);

  const value = useMemo<Prepskm2ContextValue>(
    () => ({
      progression,
      recordArenaGameResult,
      recordFocusBlockVerified,
      recordPyqSprintProgress,
      masteryMap,
      toggleMasteryStage,
      backlogTasks,
      addBacklogTask,
      toggleBacklogTask,
      rescheduleBacklogToPresent,
      deleteBacklogTask,
      zenMode,
      setZenMode,
      toggleZenMode,
      commandPaletteOpen,
      setCommandPaletteOpen,
      copilotOpen,
      setCopilotOpen,
      pendingCopilotPrompt,
      clearPendingCopilotPrompt,
      openCopilotWithPrompt,
      mentorshipPasses,
      addMentorshipPass,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      levelProgress,
      prepsbotVictory,
      triggerPrepsBotVictory,
      clearPrepsBotVictory,
      mistakeErrorTags,
      setMistakeErrorTag,
      liveTeacherRequest,
      openLiveTeacher,
      closeLiveTeacher,
    }),
    [
      progression,
      recordArenaGameResult,
      recordFocusBlockVerified,
      recordPyqSprintProgress,
      masteryMap,
      toggleMasteryStage,
      backlogTasks,
      addBacklogTask,
      toggleBacklogTask,
      rescheduleBacklogToPresent,
      deleteBacklogTask,
      zenMode,
      toggleZenMode,
      commandPaletteOpen,
      copilotOpen,
      pendingCopilotPrompt,
      clearPendingCopilotPrompt,
      openCopilotWithPrompt,
      mentorshipPasses,
      addMentorshipPass,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      levelProgress,
      prepsbotVictory,
      triggerPrepsBotVictory,
      clearPrepsBotVictory,
      mistakeErrorTags,
      setMistakeErrorTag,
      liveTeacherRequest,
      openLiveTeacher,
      closeLiveTeacher,
    ]
  );

  return <Prepskm2Context.Provider value={value}>{children}</Prepskm2Context.Provider>;
}

export function usePrepskm2() {
  const ctx = useContext(Prepskm2Context);
  if (!ctx) throw new Error('usePrepskm2 must be used inside Prepskm2Provider');
  return ctx;
}
