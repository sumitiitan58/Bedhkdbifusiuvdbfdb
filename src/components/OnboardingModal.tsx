import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, UserCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { StudentCohortId } from '../types';
import { BrandLogo } from './BrandLogo';
import { ClassSubClassPicker } from './ClassSubClassPicker';
import { playClick, playSuccess } from '../utils/soundEffects';

function GoogleLogoIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3a7.2 7.2 0 0 1-10.72-3.78H1.34v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.34 14.32a7.2 7.2 0 0 1 0-4.64V6.59H1.34a12 12 0 0 0 0 10.82l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.34 6.59l4 3.09A7.18 7.18 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

export function OnboardingModal() {
  const {
    firebaseUser,
    profile,
    cohortId,
    isAdmin,
    onboardingModalOpen,
    closeOnboardingModal,
    selectCohort,
    continueAsGuest,
    signInWithGoogle,
    logout,
    authError,
    clearAuthError,
  } = useAuth();

  const [pickedCohort, setPickedCohort] = useState<StudentCohortId>(cohortId);
  const [signingIn, setSigningIn] = useState(false);

  if (!onboardingModalOpen) return null;

  const avatarSrc = profile?.photoURL || firebaseUser?.photoURL || '';

  const handleGoogleAuth = async () => {
    playClick();
    setSigningIn(true);
    clearAuthError();
    await signInWithGoogle(pickedCohort);
    setSigningIn(false);
  };

  const handleSaveCohort = async () => {
    playSuccess();
    await selectCohort(pickedCohort);
    closeOnboardingModal();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl my-auto">
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <BrandLogo variant="navbar" />
            <h2
              id="onboarding-modal-title"
              className="pt-1 font-display text-lg font-bold text-[#0B1B3B] dark:text-white"
            >
              {firebaseUser ? 'Account & Class Track' : 'Sign In & Select Your Class'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pick Class 9–12 or Droppers, choose Board / JEE / NEET, and sync with Google.
            </p>
          </div>
          <button
            type="button"
            onClick={closeOnboardingModal}
            aria-label="Close modal"
            className="h-8 w-8 rounded-xl inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prominent Google Sign-In Card for Guests */}
        {!firebaseUser ? (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-[#0B1B3B] dark:text-white">
                Cloud Sync with Google Account
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Save CBT scores, past test solutions, weekly routine &amp; profile photo.
              </p>
            </div>
            <button
              type="button"
              disabled={signingIn}
              onClick={handleGoogleAuth}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-colors disabled:opacity-60 shrink-0"
            >
              <GoogleLogoIcon />
              <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.displayName ?? 'User avatar'}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <UserCircle2 className="w-9 h-9 text-slate-400" />
              )}
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  {profile?.displayName ?? firebaseUser.displayName ?? 'PREPSKM Student'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {firebaseUser.email}
                  {isAdmin && (
                    <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-[#F97316]">
                      <ShieldCheck className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                to="/profile"
                onClick={closeOnboardingModal}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  closeOnboardingModal();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Compact Class -> Sub-Class Drilldown */}
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Select Class &amp; Sub-Class (Board / JEE / NEET)
          </p>
          <ClassSubClassPicker
            selectedCohortId={pickedCohort}
            onSelect={setPickedCohort}
            compact
          />
        </div>

        {authError && (
          <div
            role="alert"
            className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"
          >
            {authError}
          </div>
        )}

        <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {firebaseUser ? (
            <>
              <button
                type="button"
                onClick={closeOnboardingModal}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCohort}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl transition-colors"
              >
                Save Class Selection
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  playSuccess();
                  continueAsGuest(pickedCohort);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Continue as Guest
              </button>

              <button
                type="button"
                disabled={signingIn}
                onClick={handleGoogleAuth}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B1B3B] hover:bg-[#142B59] dark:bg-[#2563EB] dark:hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-60"
              >
                <GoogleLogoIcon />
                <span>{signingIn ? 'Signing in...' : 'Sign In with Google'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
