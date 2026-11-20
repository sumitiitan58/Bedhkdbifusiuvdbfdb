import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { ADMIN_EMAILS, auth, googleProvider } from '../firebase/config';
import type { StudentCohortId, TestAttemptRecord, UserProfile, UserProgressData } from '../types';
import {
  checkAdminDocExists,
  fetchUserProfile,
  fetchUserProgress,
  saveTestAttemptToFirestore,
  saveUserProgress,
  upsertUserProfile,
} from '../services/firestoreService';
import { mergeUserProgress } from '../utils/plannerStats';
import { createDefaultWeeklySchedule } from '../utils/weeklySchedule';

const STORAGE_KEYS = {
  cohort: 'prepskm_cohort_v2',
  onboarded: 'prepskm_onboarded_v2',
  guestProfile: 'prepskm_guest_profile_v1',
  guestProgress: 'prepskm_guest_progress_v2',
  guestAttempts: 'prepskm_guest_attempts_v2',
} as const;

export const EMPTY_PROGRESS: UserProgressData = {
  userId: 'guest',
  plannerCompletedDays: [],
  weeklySchedule: createDefaultWeeklySchedule(),
  manzilProgress: {},
  lectureWatchState: {},
  bookmarkedMaterials: [],
  recentMaterials: [],
  focusSessionsMinutes: 0,
  updatedAtIso: new Date().toISOString(),
};

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface ProfilePatch {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  targetExam?: string;
  targetYear?: string;
  cohortId?: StudentCohortId;
}

export interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  cohortId: StudentCohortId;
  authReady: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  hasCompletedOnboarding: boolean;
  onboardingModalOpen: boolean;
  openOnboardingModal: () => void;
  closeOnboardingModal: () => void;
  selectCohort: (cohort: StudentCohortId) => Promise<void>;
  updateProfileDetails: (patch: ProfilePatch) => Promise<void>;
  continueAsGuest: (cohort: StudentCohortId) => void;
  signInWithGoogle: (selectedCohort?: StudentCohortId) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  migrationNotice: string | null;
  dismissMigrationNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cohortId, setCohortId] = useState<StudentCohortId>(() =>
    readLocalJson<StudentCohortId>(STORAGE_KEYS.cohort, 'class-12-jee')
  );
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    readLocalJson<UserProfile | null>(STORAGE_KEYS.guestProfile, {
      uid: 'guest',
      displayName: 'PREPSKM Student',
      email: 'guest@prepskm.in',
      bio: 'Focused on consistent daily problem solving and high-accuracy mock analysis.',
      targetExam: 'JEE Main & Advanced',
      targetYear: '2027',
      cohortId: readLocalJson<StudentCohortId>(STORAGE_KEYS.cohort, 'class-12-jee'),
      role: 'student',
    })
  );
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [migrationNotice, setMigrationNotice] = useState<string | null>(null);

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return true;
    return readLocalJson<boolean>(STORAGE_KEYS.onboarded, false);
  });

  const [onboardingModalOpen, setOnboardingModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        const localGuest = readLocalJson<UserProfile | null>(STORAGE_KEYS.guestProfile, {
          uid: 'guest',
          displayName: 'PREPSKM Student',
          email: 'guest@prepskm.in',
          bio: 'Focused on consistent daily problem solving and high-accuracy mock analysis.',
          targetExam: 'JEE Main & Advanced',
          targetYear: '2027',
          cohortId: readLocalJson<StudentCohortId>(STORAGE_KEYS.cohort, 'class-12-jee'),
          role: 'student',
        });
        setProfile(localGuest);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const emailLower = (user.email ?? '').toLowerCase();
        const emailIsAdmin =
          user.emailVerified &&
          (ADMIN_EMAILS as readonly string[]).includes(emailLower);
        const adminDoc = await checkAdminDocExists(user.uid);
        const verifiedAdmin = Boolean(emailIsAdmin || adminDoc);
        setIsAdmin(verifiedAdmin);

        const existing = await fetchUserProfile(user.uid);
        const localCohort = readLocalJson<StudentCohortId>(STORAGE_KEYS.cohort, 'class-12-jee');

        if (existing) {
          setProfile(existing);
          setCohortId(existing.cohortId);
          window.localStorage.setItem(STORAGE_KEYS.cohort, JSON.stringify(existing.cohortId));
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || emailLower.split('@')[0] || 'Student',
            email: user.email || '',
            photoURL: user.photoURL || undefined,
            bio: 'Preparing with structured weekly schedules and NTA CBT diagnostics.',
            targetExam: localCohort.includes('neet') ? 'NEET UG' : 'JEE Main & Advanced',
            targetYear: '2027',
            cohortId: localCohort,
            role: verifiedAdmin ? 'admin' : 'student',
          };
          await upsertUserProfile(newProfile, true);
          setProfile(newProfile);
        }

        const guestProg = readLocalJson<UserProgressData | null>(STORAGE_KEYS.guestProgress, null);
        const guestAttempts = readLocalJson<TestAttemptRecord[]>(STORAGE_KEYS.guestAttempts, []);
        const hasGuestWork =
          (guestProg &&
            (guestProg.plannerCompletedDays.length > 0 ||
              (guestProg.weeklySchedule?.some((w) => w.completed) ?? false) ||
              Object.keys(guestProg.lectureWatchState ?? {}).length > 0 ||
              guestProg.bookmarkedMaterials.length > 0 ||
              guestProg.focusSessionsMinutes > 0)) ||
          guestAttempts.length > 0;

        if (hasGuestWork) {
          const cloudProg = await fetchUserProgress(user.uid);
          if (guestProg) {
            const merged = mergeUserProgress(cloudProg, guestProg, user.uid);
            await saveUserProgress(merged);
          }
          for (const att of guestAttempts) {
            await saveTestAttemptToFirestore({
              ...att,
              userId: user.uid,
            });
          }
          window.localStorage.removeItem(STORAGE_KEYS.guestProgress);
          window.localStorage.removeItem(STORAGE_KEYS.guestAttempts);
          setMigrationNotice(
            'Your guest weekly schedule, study planner, and CBT test history were migrated to your Google account.'
          );
        }

        setHasCompletedOnboarding(true);
        window.localStorage.setItem(STORAGE_KEYS.onboarded, JSON.stringify(true));
      } catch (err) {
        console.error('Auth sync error:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const updateProfileDetails = useCallback(
    async (patch: ProfilePatch) => {
      const nextCohort = patch.cohortId ?? cohortId;
      if (patch.cohortId) {
        setCohortId(patch.cohortId);
        try {
          window.localStorage.setItem(STORAGE_KEYS.cohort, JSON.stringify(patch.cohortId));
        } catch {
          // ignore
        }
      }

      const current: UserProfile = profile ?? {
        uid: firebaseUser?.uid ?? 'guest',
        displayName: firebaseUser?.displayName ?? 'PREPSKM Student',
        email: firebaseUser?.email ?? 'guest@prepskm.in',
        cohortId: nextCohort,
        role: isAdmin ? 'admin' : 'student',
      };

      const updated: UserProfile = {
        ...current,
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.photoURL !== undefined ? { photoURL: patch.photoURL } : {}),
        ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
        ...(patch.targetExam !== undefined ? { targetExam: patch.targetExam } : {}),
        ...(patch.targetYear !== undefined ? { targetYear: patch.targetYear } : {}),
        cohortId: nextCohort,
      };

      setProfile(updated);

      if (firebaseUser) {
        await upsertUserProfile(updated, false);
      } else {
        try {
          window.localStorage.setItem(STORAGE_KEYS.guestProfile, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
    },
    [cohortId, firebaseUser, isAdmin, profile]
  );

  const selectCohort = useCallback(
    async (nextCohort: StudentCohortId) => {
      await updateProfileDetails({ cohortId: nextCohort });
    },
    [updateProfileDetails]
  );

  const continueAsGuest = useCallback((cohort: StudentCohortId) => {
    setCohortId(cohort);
    setHasCompletedOnboarding(true);
    setOnboardingModalOpen(false);
    setProfile((prev) => {
      const next: UserProfile = {
        uid: 'guest',
        displayName: prev?.displayName ?? 'PREPSKM Student',
        email: prev?.email ?? 'guest@prepskm.in',
        photoURL: prev?.photoURL,
        bio: prev?.bio ?? 'Focused on consistent daily problem solving and high-accuracy mock analysis.',
        targetExam: prev?.targetExam ?? (cohort.includes('neet') ? 'NEET UG' : 'JEE Main & Advanced'),
        targetYear: prev?.targetYear ?? '2027',
        cohortId: cohort,
        role: 'student',
      };
      try {
        window.localStorage.setItem(STORAGE_KEYS.guestProfile, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    try {
      window.localStorage.setItem(STORAGE_KEYS.cohort, JSON.stringify(cohort));
      window.localStorage.setItem(STORAGE_KEYS.onboarded, JSON.stringify(true));
    } catch {
      // ignore
    }
  }, []);

  const signInWithGoogle = useCallback(async (selectedCohort?: StudentCohortId) => {
    setAuthError(null);
    if (selectedCohort) {
      setCohortId(selectedCohort);
      try {
        window.localStorage.setItem(STORAGE_KEYS.cohort, JSON.stringify(selectedCohort));
      } catch {
        // ignore
      }
    }
    try {
      await signInWithPopup(auth, googleProvider);
      setOnboardingModalOpen(false);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';
      const rawMsg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'prepskm.in';
        setAuthError(
          `Domain "${host}" is not yet authorized in Firebase Auth. Open Firebase Console (project gen-lang-client-0309095308) → Authentication → Settings → Authorized domains, and add "prepskm.in" and "www.prepskm.in".`
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError('Google Sign-In popup was closed before completing sign-in.');
      } else {
        setAuthError(rawMsg);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      cohortId,
      authReady,
      isGuest: !firebaseUser,
      isAdmin,
      hasCompletedOnboarding,
      onboardingModalOpen,
      openOnboardingModal: () => setOnboardingModalOpen(true),
      closeOnboardingModal: () => setOnboardingModalOpen(false),
      selectCohort,
      updateProfileDetails,
      continueAsGuest,
      signInWithGoogle,
      logout,
      authError,
      clearAuthError: () => setAuthError(null),
      migrationNotice,
      dismissMigrationNotice: () => setMigrationNotice(null),
    }),
    [
      firebaseUser,
      profile,
      cohortId,
      authReady,
      isAdmin,
      hasCompletedOnboarding,
      onboardingModalOpen,
      selectCohort,
      updateProfileDetails,
      continueAsGuest,
      signInWithGoogle,
      logout,
      authError,
      migrationNotice,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
