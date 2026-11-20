import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, UserCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { StudentCohortId } from '../types';
import { BrandLogo } from './BrandLogo';
import { ClassSubClassPicker } from './ClassSubClassPicker';
import { playClick, playSuccess } from '../utils/soundEffects';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <BrandLogo variant="navbar" />
            <h2
              id="onboarding-modal-title"
              className="pt-2 font-display text-xl font-bold text-[#0B1B3B] dark:text-white"
            >
              {firebaseUser ? 'Account & Class Selection' : 'Choose Your Class & Stream'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click your Class (e.g., Class 11 or Class 12) to view Board, JEE, and NEET sub-classes.
            </p>
          </div>
          <button
            type="button"
            onClick={closeOnboardingModal}
            aria-label="Close modal"
            className="h-9 w-9 rounded-xl inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Signed-in Account Summary */}
        {firebaseUser && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.displayName ?? 'User avatar'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <UserCircle2 className="w-10 h-10 text-slate-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {profile?.displayName ?? firebaseUser.displayName ?? 'PREPSKM Student'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {firebaseUser.email}
                  {isAdmin && (
                    <span className="ml-2 inline-flex items-center gap-1 font-semibold text-[#F97316]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Admin
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                onClick={closeOnboardingModal}
                className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Edit Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  closeOnboardingModal();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Class -> Sub-Class Drilldown */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
            Step 1 — Pick Your Class, then Select Your Track (Board / JEE / NEET)
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
            className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"
          >
            {authError}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {firebaseUser ? (
            <>
              <button
                type="button"
                onClick={closeOnboardingModal}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCohort}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl transition-colors"
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
                className="px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Continue as Guest
              </button>

              <button
                type="button"
                disabled={signingIn}
                onClick={handleGoogleAuth}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1B3B] hover:bg-[#142B59] dark:bg-[#2563EB] dark:hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-60"
              >
                <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
