import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Lock,
  LogIn,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDownloadGate } from '../../context/DownloadGateContext';
import {
  AD_UNLOCK_DOWNLOAD_CREDITS,
  AD_VERIFY_COUNTDOWN_SECONDS,
  ADSTERRA_SMARTLINK_URL,
} from '../../utils/downloadGate';
import { playClick } from '../../utils/soundEffects';

type GateStage = 'locked' | 'verifying' | 'unlocked';

export function DownloadGateModal() {
  const { signInWithGoogle, authError } = useAuth();
  const {
    gateOpen,
    guestCredits,
    pendingDownload,
    completeAdUnlock,
    triggerPendingDownloadAfterUnlock,
    closeGate,
  } = useDownloadGate();

  const [stage, setStage] = useState<GateStage>('locked');
  const [secondsLeft, setSecondsLeft] = useState<number>(AD_VERIFY_COUNTDOWN_SECONDS);
  const [signingIn, setSigningIn] = useState(false);
  const unlockedForOpenRef = useRef(false);

  // Reset modal stage every time it opens cleanly
  useEffect(() => {
    if (gateOpen) {
      setStage('locked');
      setSecondsLeft(AD_VERIFY_COUNTDOWN_SECONDS);
      setSigningIn(false);
      unlockedForOpenRef.current = false;
    }
  }, [gateOpen, pendingDownload]);

  // Manage visible 15-second ad verification countdown
  useEffect(() => {
    if (!gateOpen || stage !== 'verifying') return;

    if (secondsLeft <= 0) {
      if (!unlockedForOpenRef.current) {
        unlockedForOpenRef.current = true;
        completeAdUnlock();
        setStage('unlocked');
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [gateOpen, stage, secondsLeft, completeAdUnlock]);

  // Close on Escape key (unless mid-verification or allow anytime)
  useEffect(() => {
    if (!gateOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGate();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gateOpen, closeGate]);

  const handleStartAdFlow = () => {
    playClick();
    unlockedForOpenRef.current = false;
    setSecondsLeft(AD_VERIFY_COUNTDOWN_SECONDS);
    setStage('verifying');
  };

  const handleGoogleSignIn = async () => {
    playClick();
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  const progressPercent = Math.round(
    ((AD_VERIFY_COUNTDOWN_SECONDS - secondsLeft) / AD_VERIFY_COUNTDOWN_SECONDS) * 100
  );

  return (
    <AnimatePresence>
      {gateOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-gate-title"
          data-testid="download-gate-modal"
          className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-2xl bg-[#0B1426] border border-cyan-500/25 text-slate-100 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-800/90 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    stage === 'unlocked'
                      ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-400'
                      : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-400'
                  }`}
                >
                  {stage === 'unlocked' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-cyan-400">
                    Free Guest Downloads Left:{' '}
                    <span className="font-mono font-bold tabular-nums text-white">
                      {guestCredits}
                    </span>
                  </p>
                  <h2
                    id="download-gate-title"
                    className="font-display text-lg font-bold text-white leading-snug mt-0.5"
                  >
                    {stage === 'unlocked'
                      ? `${AD_UNLOCK_DOWNLOAD_CREDITS} Free Downloads Unlocked!`
                      : stage === 'verifying'
                        ? 'Verifying Sponsor Ad View'
                        : 'Unlock Free PDF Downloads'}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeGate}
                aria-label="Close download unlock modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Pending file indicator */}
              {pendingDownload && (
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-400">Requested PDF</p>
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {pendingDownload.title}
                    </p>
                  </div>
                </div>
              )}

              {stage === 'locked' && (
                <>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    You have used your complimentary guest download. Support free JEE &amp; NEET
                    notes on <span className="font-semibold text-white">prepskm.in</span> by
                    viewing a quick sponsor link or signing in for unlimited access.
                  </p>

                  <div className="space-y-3">
                    {/* Primary Option: Adsterra Smartlink */}
                    <a
                      href={ADSTERRA_SMARTLINK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleStartAdFlow}
                      data-testid="watch-ad-unlock-btn"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 transition-all shadow-lg shadow-cyan-500/20 whitespace-nowrap"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      <span>Watch Ad (15s) to Unlock 3 Free Downloads</span>
                    </a>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex-1 h-px bg-slate-800" />
                      <span>or enjoy zero-wait unlimited access</span>
                      <span className="flex-1 h-px bg-slate-800" />
                    </div>

                    {/* Secondary Option: Google Sign In */}
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      disabled={signingIn}
                      data-testid="gate-google-signin-btn"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/90 hover:border-cyan-400/50 transition-colors disabled:opacity-60 whitespace-nowrap"
                    >
                      <LogIn className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        {signingIn
                          ? 'Connecting to Google…'
                          : 'Sign in with Google for Free Access'}
                      </span>
                    </button>
                  </div>

                  {authError && (
                    <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800/70 rounded-xl px-3 py-2">
                      {authError}
                    </p>
                  )}
                </>
              )}

              {stage === 'verifying' && (
                <div className="space-y-4 py-2 text-center" data-testid="ad-countdown-panel">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <Clock className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <p
                      className="font-mono text-base font-bold text-white tabular-nums"
                      aria-live="polite"
                    >
                      Verifying ad view... {secondsLeft}s remaining
                    </p>
                    <p className="text-xs text-slate-400">
                      Keep this tab open for {secondsLeft}s to unlock {AD_UNLOCK_DOWNLOAD_CREDITS}{' '}
                      free PDF downloads.
                    </p>
                  </div>

                  {/* Smooth Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Sponsor tab didn’t open?{' '}
                    <a
                      href={ADSTERRA_SMARTLINK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline font-semibold"
                    >
                      Open link again
                    </a>
                  </p>
                </div>
              )}

              {stage === 'unlocked' && (
                <div className="space-y-4 py-1 text-center" data-testid="ad-unlocked-panel">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <p className="font-display text-lg font-bold text-white">
                      3 Free Downloads Unlocked!
                    </p>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Your account now has{' '}
                      <span className="font-mono font-bold text-cyan-300 tabular-nums">
                        {guestCredits}
                      </span>{' '}
                      free guest PDF downloads ready to use.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void triggerPendingDownloadAfterUnlock()}
                    data-testid="download-unlocked-pdf-btn"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download Your PDF Now</span>
                  </button>
                </div>
              )}

              {/* Footer note */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  100% Free Notes for JEE &amp; NEET
                </span>
                <span className="font-mono text-slate-500">prepskm.in</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
