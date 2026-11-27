import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { usePlatformData } from '../context/PlatformDataContext';
import { playClick, playSuccess, playWarning } from '../utils/soundEffects';

const PRESET_MINUTES = [25, 50, 90] as const;
const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'] as const;
const SCRATCHPAD_KEY = 'prepskm2_zen_scratchpad_v1';

function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ZenStudyOverlay() {
  const { zenMode, setZenMode, recordFocusBlockVerified } = usePrepskm2();
  const { logFocusMinutes } = usePlatformData();

  const [presetMins, setPresetMins] = useState<(typeof PRESET_MINUTES)[number]>(25);
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>('Physics');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [focusBreaks, setFocusBreaks] = useState(0);
  const [loggedBanner, setLoggedBanner] = useState('');
  const [scratchpad, setScratchpad] = useState<string>(() => {
    try {
      return window.localStorage.getItem(SCRATCHPAD_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    try {
      window.localStorage.setItem(SCRATCHPAD_KEY, scratchpad);
    } catch {
      // ignore storage errors
    }
  }, [scratchpad]);

  // Real tab-switching / focus-break detector during active Zen sessions
  useEffect(() => {
    if (!zenMode) return;
    const onVisibilityChange = () => {
      if (document.hidden && runningRef.current) {
        setFocusBreaks((b) => b + 1);
        playWarning();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [zenMode]);

  useEffect(() => {
    if (!zenMode || !running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          playSuccess();
          logFocusMinutes(presetMins);
          recordFocusBlockVerified(presetMins, focusBreaks);
          setLoggedBanner(
            `Verified ${presetMins}m ${subject} deep-work block logged (+${presetMins * 2} XP, Daily Trifecta Pillar #2 unlocked)!`
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [zenMode, running, presetMins, subject, focusBreaks, logFocusMinutes, recordFocusBlockVerified]);

  if (!zenMode) return null;

  const elapsedMins = Math.max(1, Math.round((presetMins * 60 - secondsLeft) / 60));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zen Study Mode"
      className="fixed inset-0 z-[90] bg-[#070A12] text-slate-100 flex flex-col overflow-y-auto"
    >
      {/* Minimal Single-Row Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-bold tracking-tight text-white">
            Zen Study Mode
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-400">
            All feeds, sidebars &amp; notifications hidden
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playClick();
            setRunning(false);
            setZenMode(false);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0D1324] border border-[#00B4FF]/30 text-xs font-semibold text-slate-200 hover:border-[#00B4FF] transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          Exit Zen Mode
        </button>
      </div>

      {/* Main Two-Column Deep Work Canvas */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Timer Stage */}
        <div className="lg:col-span-6 rounded-2xl bg-[#0D1324] border border-[#00B4FF]/20 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#070A12] p-1 rounded-lg border border-white/10">
              {PRESET_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    playClick();
                    setPresetMins(m);
                    setSecondsLeft(m * 60);
                    setRunning(false);
                    setLoggedBanner('');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors ${
                    presetMins === m
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            <select
              aria-label="Study subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
              className="px-3 py-1.5 rounded-lg bg-[#09090B] border border-white/[0.1] text-xs font-semibold text-zinc-200"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="py-8 text-center space-y-2">
            <p className="text-xs font-medium text-zinc-400">
              {subject} Deep-Work Sprint · Tab-switch monitor active
            </p>
            <p className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-white tabular-nums">
              {formatTimer(secondsLeft)}
            </p>
            <p className="text-xs font-mono tabular-nums text-zinc-400">
              Focus breaks detected:{' '}
              <span className={focusBreaks > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {focusBreaks}
              </span>
            </p>
          </div>

          {focusBreaks > 0 && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                You switched away {focusBreaks} time{focusBreaks === 1 ? '' : 's'}. Keep this tab focused to protect deep flow.
              </span>
            </div>
          )}

          {loggedBanner && (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{loggedBanner}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                setRunning((r) => !r);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-sm font-extrabold transition-colors shadow-[0_0_24px_rgba(0,180,255,0.35)]"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? 'Pause Session' : 'Start Focus Block'}
            </button>

            <button
              type="button"
              onClick={() => {
                playClick();
                setRunning(false);
                setSecondsLeft(presetMins * 60);
                setFocusBreaks(0);
              }}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#09090B] border border-white/[0.1] text-zinc-300 hover:text-white text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <button
              type="button"
              onClick={() => {
                playSuccess();
                setRunning(false);
                const minsToLog = Math.max(25, elapsedMins);
                logFocusMinutes(minsToLog);
                recordFocusBlockVerified(minsToLog, focusBreaks);
                setLoggedBanner(
                  `Logged ${minsToLog}m verified ${subject} focus block & unlocked Daily Trifecta Pillar #2.`
                );
              }}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-sm font-semibold"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete &amp; Log
            </button>
          </div>
        </div>

        {/* Right: Distraction-Free Formula & Derivation Scratchpad */}
        <div className="lg:col-span-6 rounded-2xl bg-[#0D1324] border border-[#00B4FF]/20 p-6 flex flex-col gap-4 min-h-[420px]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Derivation &amp; Formula Scratchpad
              </h2>
              <p className="text-xs text-slate-400">
                Auto-saved locally · Jot rough equations, NCERT exceptions, or active problem steps
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScratchpad('')}
              aria-label="Clear scratchpad"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-[#F43F5E] hover:bg-white/[0.04]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          <textarea
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            placeholder="Example:&#10;v_e = sqrt(2GM/R)&#10;Parallel axis: I = I_cm + Md^2&#10;O2 is paramagnetic (2 unpaired e- in pi*2p)..."
            className="flex-1 min-h-[320px] w-full rounded-xl bg-[#070A12] border border-white/10 p-4 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00B4FF] resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
