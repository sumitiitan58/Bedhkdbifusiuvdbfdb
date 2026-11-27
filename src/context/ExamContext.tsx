import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePlatformData } from './PlatformDataContext';

export type ExamTrackId = 'jee' | 'neet' | 'boards';

export interface ExamTrackConfig {
  id: ExamTrackId;
  label: string;
  shortLabel: string;
  hindiLabel: string;
  maxMarks: number;
  subjects: string[];
  primaryExamName: string;
  counsellingAuthority: 'JoSAA' | 'MCC';
}

export const EXAM_TRACK_CONFIGS: Record<ExamTrackId, ExamTrackConfig> = {
  jee: {
    id: 'jee',
    label: 'JEE Main/Adv',
    shortLabel: 'JEE',
    hindiLabel: 'JEE मेन/एडवांस',
    maxMarks: 300,
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    primaryExamName: 'JEE Main 2027',
    counsellingAuthority: 'JoSAA',
  },
  neet: {
    id: 'neet',
    label: 'NEET UG',
    shortLabel: 'NEET',
    hindiLabel: 'NEET UG',
    maxMarks: 720,
    subjects: ['Physics', 'Chemistry', 'Biology'],
    primaryExamName: 'NEET UG 2027',
    counsellingAuthority: 'MCC',
  },
  boards: {
    id: 'boards',
    label: 'Class 9–12',
    shortLabel: '9–12',
    hindiLabel: 'कक्षा 9–12',
    maxMarks: 500,
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    primaryExamName: 'CBSE / Boards 2027',
    counsellingAuthority: 'JoSAA',
  },
};

function inferTrackFromCohort(cohortId: string, label: string): ExamTrackId {
  const combined = `${cohortId} ${label}`.toLowerCase();
  if (combined.includes('neet')) return 'neet';
  if (combined.includes('jee')) return 'jee';
  return 'boards';
}

const BLITZ_REG_KEY = 'prepskm_sunday_blitz_reg_v1';
const LAST_CHAPTER_KEY = 'prepskm_last_chapter_v1';

export interface LastPracticedChapter {
  subject: string;
  chapter: string;
  progressPercent: number;
  route: string;
}

const DEFAULT_LAST_CHAPTER: Record<ExamTrackId, LastPracticedChapter> = {
  jee: {
    subject: 'Physics',
    chapter: 'Electrostatics — Gauss Law',
    progressPercent: 68,
    route: '/learn?tab=pyqs&chapter=Electrostatics',
  },
  neet: {
    subject: 'Biology',
    chapter: 'Human Physiology — Breathing & Exchange',
    progressPercent: 74,
    route: '/learn?tab=ncert',
  },
  boards: {
    subject: 'Chemistry',
    chapter: 'Chemical Bonding & Molecular Structure',
    progressPercent: 60,
    route: '/learn?tab=pyqs&chapter=Chemical%20Bonding',
  },
};

interface ExamContextValue {
  examTrack: ExamTrackId;
  trackConfig: ExamTrackConfig;
  setExamTrack: (track: ExamTrackId) => void;
  sundayBlitzRegistered: boolean;
  sundayBlitzTrack: 'jee' | 'neet';
  setSundayBlitzTrack: (track: 'jee' | 'neet') => void;
  toggleSundayBlitzRegistration: () => void;
  lastPracticed: LastPracticedChapter;
  setLastPracticed: (chapter: LastPracticedChapter) => void;
}

const ExamContext = createContext<ExamContextValue | null>(null);

export function ExamProvider({ children }: { children: ReactNode }) {
  const { cohortId, selectCohort } = useAuth();
  const { allCohorts } = usePlatformData();

  const currentCohort = useMemo(
    () => allCohorts.find((c) => c.id === cohortId) ?? allCohorts[0],
    [allCohorts, cohortId]
  );

  const examTrack = useMemo<ExamTrackId>(
    () => inferTrackFromCohort(cohortId, currentCohort?.label ?? ''),
    [cohortId, currentCohort?.label]
  );

  const [sundayBlitzRegistered, setSundayBlitzRegistered] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(BLITZ_REG_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [sundayBlitzTrack, setSundayBlitzTrack] = useState<'jee' | 'neet'>(() =>
    examTrack === 'neet' ? 'neet' : 'jee'
  );

  useEffect(() => {
    if (examTrack === 'neet' || examTrack === 'jee') {
      setSundayBlitzTrack(examTrack);
    }
  }, [examTrack]);

  const [customLastPracticed, setCustomLastPracticed] = useState<LastPracticedChapter | null>(() => {
    try {
      const raw = window.localStorage.getItem(LAST_CHAPTER_KEY);
      return raw ? (JSON.parse(raw) as LastPracticedChapter) : null;
    } catch {
      return null;
    }
  });

  const setExamTrack = useCallback(
    (trackId: ExamTrackId) => {
      let match = allCohorts.find((c) => {
        const hay = `${c.id} ${c.label} ${c.stream}`.toLowerCase();
        if (trackId === 'jee') return hay.includes('12') && hay.includes('jee');
        if (trackId === 'neet') return hay.includes('12') && hay.includes('neet');
        return hay.includes('board') || hay.includes('class 10') || hay.includes('foundation');
      });
      if (!match) {
        match = allCohorts.find((c) => {
          const hay = `${c.id} ${c.label}`.toLowerCase();
          if (trackId === 'jee') return hay.includes('jee');
          if (trackId === 'neet') return hay.includes('neet');
          return !hay.includes('jee') && !hay.includes('neet');
        });
      }
      if (match) {
        void selectCohort(match.id);
      }
    },
    [allCohorts, selectCohort]
  );

  const toggleSundayBlitzRegistration = useCallback(() => {
    setSundayBlitzRegistered((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(BLITZ_REG_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setLastPracticed = useCallback((chapter: LastPracticedChapter) => {
    setCustomLastPracticed(chapter);
    try {
      window.localStorage.setItem(LAST_CHAPTER_KEY, JSON.stringify(chapter));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ExamContextValue>(
    () => ({
      examTrack,
      trackConfig: EXAM_TRACK_CONFIGS[examTrack],
      setExamTrack,
      sundayBlitzRegistered,
      sundayBlitzTrack,
      setSundayBlitzTrack,
      toggleSundayBlitzRegistration,
      lastPracticed: customLastPracticed ?? DEFAULT_LAST_CHAPTER[examTrack],
      setLastPracticed,
    }),
    [
      examTrack,
      setExamTrack,
      sundayBlitzRegistered,
      sundayBlitzTrack,
      toggleSundayBlitzRegistration,
      customLastPracticed,
      setLastPracticed,
    ]
  );

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}

export function useExam(): ExamContextValue {
  const ctx = useContext(ExamContext);
  if (!ctx) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return ctx;
}
