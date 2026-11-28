import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  DoorOpen,
  Flame,
  FlaskConical,
  KeyRound,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { saveApexProfileStats } from '../../services/blueprintStore';
import {
  applyCyberLabPenalty,
  checkNumericalAnswer,
  checkStoichiometryBalance,
  computeEscapeRank,
  createCyberLabRun,
  createKhandaharRun,
  HANDWRITTEN_FORMULA_SHEETS,
  verifyKhandaharPasscode,
  type CyberLabRunState,
  type EscapeDifficulty,
  type EscapeEdition,
  type KhandaharChamberState,
} from '../../utils/chemistryEscapeLogic';

interface ChemistryEscapeRoomGameProps {
  onBack: () => void;
}

type CyberStationId = 'periodic' | 'mixing' | 'fume' | 'laser' | 'blast' | null;

function playSynthSfx(
  kind: 'click' | 'success' | 'buzzer' | 'explosion' | 'door-open',
  enabled: boolean
) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (kind === 'explosion') {
      // Synthesized low-pass filtered noise BOOM shockwave
      const bufferSize = ctx.sampleRate * 1.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);
      filter.frequency.exponentialRampToValueAtTime(45, now + 0.9);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(now);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);

    if (kind === 'buzzer') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(95, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (kind === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.09);
      osc.frequency.setValueAtTime(783.99, now + 0.18);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (kind === 'door-open') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.58);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  } catch {
    // ignore Web Audio block errors
  }
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ChemistryEscapeRoomGame({ onBack }: ChemistryEscapeRoomGameProps) {
  const { firebaseUser } = useAuth();
  const { recordArenaGameResult, triggerPrepsBotVictory } = usePrepskm2();
  const userScope = firebaseUser?.uid ?? 'guest';

  const [edition, setEdition] = useState<EscapeEdition | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [shakeActive, setShakeActive] = useState(false);
  const [smokePuff, setSmokePuff] = useState(false);

  // Cyber-Lab Sector 7 State
  const [cyberDifficulty, setCyberDifficulty] = useState<EscapeDifficulty>('JEE Main');
  const [cyber, setCyber] = useState<CyberLabRunState>(() => createCyberLabRun('JEE Main'));
  const [activeStation, setActiveStation] = useState<CyberStationId>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formulaTab, setFormulaTab] = useState<'Physical' | 'Organic' | 'Inorganic'>('Physical');
  const [prepsBotTip, setPrepsBotTip] = useState(
    'Tap any glowing Sector 7 station! Collect all 4 passcode digits & inventory tools to open the Hydraulic Blast Door.'
  );

  // Cyber-Lab station local form inputs
  const [selectedReagent, setSelectedReagent] = useState(0);
  const [mixCoeffs, setMixCoeffs] = useState<[number, number, number]>([1, 1, 1]);
  const [organicStepIdx, setOrganicStepIdx] = useState(0);
  const [laserInput, setLaserInput] = useState('');
  const [blastCodeInput, setBlastCodeInput] = useState('');
  const [overrideCoeffs, setOverrideCoeffs] = useState<[number, number, number]>([1, 1, 1]);

  // Khandahar Ruined Building State
  const [khandaharLevel, setKhandaharLevel] = useState<1 | 2 | 3>(1);
  const [khandahar, setKhandahar] = useState<KhandaharChamberState>(() => createKhandaharRun(1));
  const [activeDoorSlot, setActiveDoorSlot] = useState<number | null>(null);
  const [c4CodeInput, setC4CodeInput] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [subtitleLine, setSubtitleLine] = useState('');
  const lastSpokenRef = useRef('');

  const speakNarrator = useCallback(
    (line: string) => {
      setSubtitleLine(line);
      lastSpokenRef.current = line;
      if (voiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(line);
        utter.rate = 0.98;
        utter.pitch = 0.94;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis restrictions
      }
    },
    [voiceMuted]
  );

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Mirror game state to document.body.dataset.state for Playwright testability
  useEffect(() => {
    if (!edition) {
      document.body.dataset.state = 'title';
    } else if (edition === 'cyber-lab') {
      document.body.dataset.state = cyber.status === 'playing' ? 'playing' : 'gameover';
    } else {
      document.body.dataset.state = khandahar.status === 'playing' ? 'playing' : 'gameover';
    }
    return () => {
      delete document.body.dataset.state;
    };
  }, [edition, cyber.status, khandahar.status]);

  // Cyber-Lab 1Hz countdown timer
  useEffect(() => {
    if (edition !== 'cyber-lab' || cyber.status !== 'playing') return;
    const id = window.setInterval(() => {
      setCyber((prev) => {
        if (prev.status !== 'playing') return prev;
        const nextTime = Math.max(0, prev.timeRemainingSec - 1);
        if (nextTime <= 0) {
          return {
            ...prev,
            timeRemainingSec: 0,
            status: 'failed',
            failReason: 'Containment timer hit 00:00 in Cyber-Lab Sector 7.',
          };
        }
        return { ...prev, timeRemainingSec: nextTime };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [edition, cyber.status]);

  // Khandahar 1Hz countdown timer
  useEffect(() => {
    if (edition !== 'khandahar' || khandahar.status !== 'playing') return;
    const id = window.setInterval(() => {
      setKhandahar((prev) => {
        if (prev.status !== 'playing') return prev;
        const nextTime = Math.max(0, prev.timeRemainingSec - 1);
        if (nextTime <= 0) {
          playSynthSfx('explosion', sfxEnabled);
          speakNarrator('Boom! Time expired! Explosion triggered. You are dead!');
          return { ...prev, timeRemainingSec: 0, status: 'detonated' };
        }
        return { ...prev, timeRemainingSec: nextTime };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [edition, khandahar.status, sfxEnabled, speakNarrator]);

  const triggerMistakeFx = useCallback(() => {
    playSynthSfx('buzzer', sfxEnabled);
    setShakeActive(true);
    setSmokePuff(true);
    window.setTimeout(() => setShakeActive(false), 420);
    window.setTimeout(() => setSmokePuff(false), 850);
  }, [sfxEnabled]);

  const startCyberLab = useCallback(
    (diff: EscapeDifficulty = cyberDifficulty) => {
      setCyberDifficulty(diff);
      setCyber(createCyberLabRun(diff, Date.now() + Math.floor(Math.random() * 999)));
      setActiveStation(null);
      setSelectedReagent(0);
      setMixCoeffs([1, 1, 1]);
      setOrganicStepIdx(0);
      setLaserInput('');
      setBlastCodeInput('');
      setOverrideCoeffs([1, 1, 1]);
      setPrepsBotTip(
        `Sector 7 lockdown active (${diff}). Solve all 4 lab stations to unlock the 4-digit Blast Door code!`
      );
      setEdition('cyber-lab');
    },
    [cyberDifficulty]
  );

  const startKhandahar = useCallback(
    (lvl: 1 | 2 | 3 = khandaharLevel) => {
      const fresh = createKhandaharRun(lvl, Date.now() + Math.floor(Math.random() * 999));
      setKhandaharLevel(lvl);
      setKhandahar(fresh);
      setActiveDoorSlot(null);
      setC4CodeInput('');
      setEdition('khandahar');
      speakNarrator(
        `You have entered ${fresh.chamberTitle}. A child is trapped beside an active C4 lock. Inspect all 4 nested doors to uncover the 4-digit chemistry disarm code.`
      );
    },
    [khandaharLevel, speakNarrator]
  );

  // Cyber-Lab Station Solvers
  const handlePeriodicAnswer = (idx: number) => {
    if (cyber.status !== 'playing' || cyber.solvedStations.periodicSafe) return;
    if (idx === cyber.puzzles.periodic.correctIndex) {
      playSynthSfx('success', sfxEnabled);
      setCyber((prev) => {
        const nextDigits: CyberLabRunState['digits'] = [...prev.digits] as CyberLabRunState['digits'];
        nextDigits[0] = prev.puzzles.periodic.digit;
        return {
          ...prev,
          attempts: prev.attempts + 1,
          correctCount: prev.correctCount + 1,
          score: prev.score + 250,
          digits: nextDigits,
          inventory: { ...prev.inventory, labKeycard: true },
          solvedStations: { ...prev.solvedStations, periodicSafe: true },
        };
      });
      setPrepsBotTip(
        `Safe cracked! Acquired Lab Keycard & Digit #1 = ${cyber.puzzles.periodic.digit}. Head to the Mixing Bench!`
      );
      setActiveStation(null);
    } else {
      triggerMistakeFx();
      setCyber((prev) => applyCyberLabPenalty(prev));
      setPrepsBotTip('Containment leak! −20s & −10% O₂. Check the Inorganic sheet in the Formula Drawer!');
    }
  };

  const handleMixingSubmit = () => {
    if (cyber.status !== 'playing' || cyber.solvedStations.mixingBench) return;
    const reagentOk = selectedReagent === cyber.puzzles.mixing.correctReagentIndex;
    const balanceOk = checkStoichiometryBalance(mixCoeffs, cyber.puzzles.mixing.targetCoefficients);
    if (reagentOk && balanceOk) {
      playSynthSfx('success', sfxEnabled);
      setCyber((prev) => {
        const nextDigits: CyberLabRunState['digits'] = [...prev.digits] as CyberLabRunState['digits'];
        nextDigits[1] = prev.puzzles.mixing.digit;
        return {
          ...prev,
          attempts: prev.attempts + 1,
          correctCount: prev.correctCount + 1,
          score: prev.score + 300,
          digits: nextDigits,
          inventory: { ...prev.inventory, catalystVial: true },
          solvedStations: { ...prev.solvedStations, mixingBench: true },
        };
      });
      setPrepsBotTip(
        `Emerald reaction stabilized! Catalyst Vial acquired & Digit #2 = ${cyber.puzzles.mixing.digit}.`
      );
      setActiveStation(null);
    } else {
      triggerMistakeFx();
      setCyber((prev) => applyCyberLabPenalty(prev));
      setPrepsBotTip(
        !reagentOk
          ? 'Wrong reagent selected! (−20s, −10% O₂)'
          : 'Stoichiometric coefficients unbalanced! Adjust +/− counters (−20s, −10% O₂).'
      );
    }
  };

  const handleOrganicStepChoice = (idx: number) => {
    if (cyber.status !== 'playing' || cyber.solvedStations.fumeHood) return;
    const step = cyber.puzzles.organic.steps[organicStepIdx];
    if (idx === step.correctIndex) {
      playSynthSfx('success', sfxEnabled);
      if (organicStepIdx < 2) {
        setOrganicStepIdx((s) => s + 1);
      } else {
        setCyber((prev) => {
          const nextDigits: CyberLabRunState['digits'] = [...prev.digits] as CyberLabRunState['digits'];
          nextDigits[2] = prev.puzzles.organic.digit;
          return {
            ...prev,
            attempts: prev.attempts + 1,
            correctCount: prev.correctCount + 1,
            score: prev.score + 320,
            digits: nextDigits,
            inventory: { ...prev.inventory, ventChip: true },
            solvedStations: { ...prev.solvedStations, fumeHood: true },
          };
        });
        setPrepsBotTip(
          `Green toxic fumes cleared! Vent Chip acquired & Digit #3 = ${cyber.puzzles.organic.digit}.`
        );
        setActiveStation(null);
      }
    } else {
      triggerMistakeFx();
      setCyber((prev) => applyCyberLabPenalty(prev));
      setPrepsBotTip('Organic pathway misfire! Check Named Reactions in the Formula Drawer (−20s, −10% O₂).');
    }
  };

  const handleLaserSubmit = () => {
    if (cyber.status !== 'playing' || cyber.solvedStations.laserTerminal) return;
    const ok = checkNumericalAnswer(
      laserInput,
      cyber.puzzles.laser.expectedValue,
      cyber.puzzles.laser.tolerance
    );
    if (ok) {
      playSynthSfx('success', sfxEnabled);
      setCyber((prev) => {
        const nextDigits: CyberLabRunState['digits'] = [...prev.digits] as CyberLabRunState['digits'];
        nextDigits[3] = prev.puzzles.laser.digit;
        return {
          ...prev,
          attempts: prev.attempts + 1,
          correctCount: prev.correctCount + 1,
          score: prev.score + 350,
          digits: nextDigits,
          inventory: { ...prev.inventory, laserPass: true },
          solvedStations: { ...prev.solvedStations, laserTerminal: true },
        };
      });
      setPrepsBotTip(
        `Red security lasers disabled! Laser Pass acquired & Digit #4 = ${cyber.puzzles.laser.digit}. Proceed to Hydraulic Blast Door!`
      );
      setActiveStation(null);
    } else {
      triggerMistakeFx();
      setCyber((prev) => applyCyberLabPenalty(prev));
      setPrepsBotTip('Laser numerical mismatch! Verify units and logs (−20s, −10% O₂).');
    }
  };

  const handleBlastDoorUnlock = () => {
    if (cyber.status !== 'playing') return;
    const expectedCode = cyber.digits.every((d) => d !== null)
      ? cyber.digits.join('')
      : `${cyber.puzzles.periodic.digit}${cyber.puzzles.mixing.digit}${cyber.puzzles.organic.digit}${cyber.puzzles.laser.digit}`;
    const codeOk = blastCodeInput.trim() === expectedCode;
    const overrideOk = checkStoichiometryBalance(
      overrideCoeffs,
      cyber.puzzles.override.targetCoefficients
    );

    if (codeOk && overrideOk) {
      playSynthSfx('door-open', sfxEnabled);
      const finalState: CyberLabRunState = {
        ...cyber,
        attempts: cyber.attempts + 1,
        correctCount: cyber.correctCount + 1,
        score: cyber.score + 500 + Math.round(cyber.timeRemainingSec * 1.5),
        solvedStations: { ...cyber.solvedStations, blastDoor: true },
        status: 'escaped',
      };
      setCyber(finalState);
      setActiveStation(null);
      const report = computeEscapeRank(finalState);
      saveApexProfileStats(userScope, {
        bestCyberLabRank: report.rank,
        conceptsMastered: report.conceptsMastered,
      });
      recordArenaGameResult({
        gameName: `Chemistry Escape: Cyber-Lab (${cyberDifficulty})`,
        subject: 'chemistry',
        score: finalState.score,
        accuracyRatio: report.accuracyPercent / 100,
        maxCombo: 5,
        xpEarned: report.rank === 'S' ? 280 : report.rank === 'A' ? 210 : 150,
      });
      triggerPrepsBotVictory({
        title: `Sector 7 Escaped — Rank ${report.rank}!`,
        subtitle: `${report.accuracyPercent}% accuracy · ${finalState.score} pts · 5 Chemistry concepts mastered.`,
        badge: `RANK ${report.rank}`,
      });
    } else {
      triggerMistakeFx();
      setCyber((prev) => applyCyberLabPenalty(prev));
      setPrepsBotTip(
        !codeOk
          ? '4-Digit Blast Code incorrect! Solve all 4 lab stations first (−20s, −10% O₂).'
          : 'Final hydraulic override equation is unbalanced! (−20s, −10% O₂).'
      );
    }
  };

  const handleUseSmartHint = () => {
    if (cyber.hintsRemaining <= 0) return;
    playSynthSfx('click', sfxEnabled);
    let hintMsg = cyber.puzzles.periodic.hint;
    if (!cyber.solvedStations.periodicSafe) hintMsg = `Periodic Safe Hint: ${cyber.puzzles.periodic.hint}`;
    else if (!cyber.solvedStations.mixingBench) hintMsg = `Mixing Bench Hint: ${cyber.puzzles.mixing.hint}`;
    else if (!cyber.solvedStations.fumeHood) hintMsg = `Fume Hood Hint: ${cyber.puzzles.organic.hint}`;
    else if (!cyber.solvedStations.laserTerminal) hintMsg = `Laser Terminal Hint: ${cyber.puzzles.laser.hint}`;
    else hintMsg = `Final Override Hint: Balance ${cyber.puzzles.override.equationDisplay} with coefficients ${cyber.puzzles.override.targetCoefficients.join(', ')}.`;

    setCyber((prev) => ({ ...prev, hintsRemaining: prev.hintsRemaining - 1 }));
    setPrepsBotTip(hintMsg);
  };

  // Khandahar Nested Door & C4 Disarm Handlers
  const handleSelectKhandaharDoor = (slotIdx: number) => {
    const clue = khandahar.clues[slotIdx];
    if (!clue || khandahar.status !== 'playing') return;
    playSynthSfx('click', sfxEnabled);
    setActiveDoorSlot(slotIdx);
    speakNarrator(
      `Inspecting ${clue.doorName} for Digit ${slotIdx + 1}. Answer carefully to uncover the C4 disarm number.`
    );
  };

  const handleKhandaharClueAnswer = (slotIdx: number, optionIdx: number) => {
    const clue = khandahar.clues[slotIdx];
    if (!clue || khandahar.status !== 'playing') return;
    if (optionIdx === clue.correctIndex) {
      playSynthSfx('success', sfxEnabled);
      setKhandahar((prev) => {
        const solvedSlots = [...prev.solvedSlots] as KhandaharChamberState['solvedSlots'];
        const unlockedDigits = [...prev.unlockedDigits] as KhandaharChamberState['unlockedDigits'];
        const unlockedHints = [...prev.unlockedHints] as KhandaharChamberState['unlockedHints'];
        solvedSlots[slotIdx] = true;
        unlockedDigits[slotIdx] = clue.digit;
        unlockedHints[slotIdx] = clue.spokenHint;
        return {
          ...prev,
          attempts: prev.attempts + 1,
          correctCount: prev.correctCount + 1,
          score: prev.score + 220,
          solvedSlots,
          unlockedDigits,
          unlockedHints,
        };
      });
      speakNarrator(clue.spokenHint);
      setActiveDoorSlot(null);
    } else {
      triggerMistakeFx();
      setKhandahar((prev) => ({
        ...prev,
        attempts: prev.attempts + 1,
        timeRemainingSec: Math.max(0, prev.timeRemainingSec - 15),
      }));
      speakNarrator('Caution! That answer is wrong. The ruins tremble and 15 seconds are lost.');
    }
  };

  const handleDisarmC4 = () => {
    if (khandahar.status !== 'playing' || c4CodeInput.length < 4) return;
    const result = verifyKhandaharPasscode(khandahar, c4CodeInput);
    setKhandahar(result.nextState);
    if (result.success) {
      playSynthSfx('door-open', sfxEnabled);
      speakNarrator(result.voiceLine);
      saveApexProfileStats(userScope, {
        bestKhandaharLevelCleared: khandahar.level,
        conceptsMastered: khandahar.clues.map((c) => c.concept),
      });
      recordArenaGameResult({
        gameName: `Chemistry Escape: Khandahar Lv.${khandahar.level}`,
        subject: 'chemistry',
        score: result.nextState.score,
        accuracyRatio:
          result.nextState.attempts > 0
            ? result.nextState.correctCount / result.nextState.attempts
            : 1,
        maxCombo: 4,
        xpEarned: 180 + khandahar.level * 60,
      });
    } else {
      playSynthSfx('explosion', sfxEnabled);
      setShakeActive(true);
      window.setTimeout(() => setShakeActive(false), 750);
      speakNarrator(result.voiceLine);
    }
  };

  const cyberReport = useMemo(() => computeEscapeRank(cyber), [cyber]);

  // ==========================================
  // EDITION LAUNCH SCREEN
  // ==========================================
  if (!edition) {
    return (
      <div className="min-h-[80vh] rounded-3xl bg-[#070B14] border border-slate-800 p-6 sm:p-8 text-slate-100">
        <div className="flex items-center justify-between gap-3 mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Apex Arena
          </button>
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Apex Arena · Flagship Game 2
          </span>
        </div>

        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Chemistry Lab Escape Room
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl mx-auto">
            Choose your escape scenario. Every station, door lock, and explosive disarm code requires genuine JEE/NEET Physical, Organic, and Inorganic Chemistry mastery.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Edition 1: Cyber-Lab Sector 7 */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-[#091224] border border-cyan-500/35 p-6 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  Edition 1 · Sci-Fi Containment
                </span>
                <FlaskConical className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                Cyber-Lab Sector 7
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                10:00 countdown &amp; Oxygen Integrity HUD. Solve 5 interactive lab stations: Periodic Wall Safe, Stoichiometry Mixing Bench, 3-Step Organic Fume Hood, Laser Numerical Terminal, and Hydraulic Blast Door.
              </p>
              <div className="mt-4 flex items-center gap-2">
                {(['JEE Main', 'JEE Advanced'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setCyberDifficulty(diff)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      cyberDifficulty === diff
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              data-testid="launch-cyber-lab-btn"
              onClick={() => startCyberLab(cyberDifficulty)}
              className="w-full py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm transition cursor-pointer"
            >
              Enter Cyber-Lab Sector 7 ({cyberDifficulty})
            </button>
          </div>

          {/* Edition 2: Khandahar Ruined Building */}
          <div className="rounded-3xl bg-gradient-to-b from-stone-900 to-[#1A0D0A] border border-amber-500/35 p-6 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Edition 2 · High-Stakes Horror Rescue
                </span>
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                Khandahar — Ruined Building
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Voice-guided 3-level nested door rescue! Uncover 4 chemistry numeric hints from haunted doors to disarm the C4 bomb beside the trapped child survivor. One wrong code triggers detonation!
              </p>
              <div className="mt-4 flex items-center gap-2">
                {([1, 2, 3] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setKhandaharLevel(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      khandaharLevel === lvl
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    Level {lvl}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              data-testid="launch-khandahar-btn"
              onClick={() => startKhandahar(khandaharLevel)}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition cursor-pointer"
            >
              Enter Khandahar Level {khandaharLevel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // EDITION 1: CYBER-LAB SECTOR 7 GAMEPLAY
  // ==========================================
  if (edition === 'cyber-lab') {
    const stationsDone = [
      cyber.solvedStations.periodicSafe,
      cyber.solvedStations.mixingBench,
      cyber.solvedStations.fumeHood,
      cyber.solvedStations.laserTerminal,
    ].filter(Boolean).length;

    return (
      <div
        className={`relative rounded-3xl bg-[#050A14] border border-cyan-500/30 overflow-hidden text-slate-100 ${
          shakeActive ? 'animate-pulse ring-4 ring-rose-500' : ''
        }`}
      >
        {/* Top Sector 7 HUD */}
        <div className="px-4 py-3 bg-[#091224] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEdition(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              aria-label="Back to Edition Selector"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                Cyber-Lab Sector 7 · {cyber.difficulty}
              </p>
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums mt-0.5">
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                  <Timer className="w-3.5 h-3.5" />
                  {formatClock(cyber.timeRemainingSec)}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                  <Wind className="w-3.5 h-3.5" />
                  O₂ {cyber.oxygenPercent}%
                </span>
                <span className="text-sky-300 font-bold">Score {cyber.score}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Collected 4-Digit Passcode Slots */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400 mr-1" />
              {cyber.digits.map((d, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                    d !== null
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {d !== null ? d : '?'}
                </span>
              ))}
            </div>

            <button
              type="button"
              data-testid="formula-drawer-btn"
              onClick={() => setDrawerOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-bold cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Formulas &amp; Hints ({cyber.hintsRemaining})
            </button>

            <button
              type="button"
              onClick={() => setSfxEnabled((s) => !s)}
              className="p-2 rounded-xl bg-slate-800 text-slate-200 cursor-pointer"
              aria-label="Toggle SFX"
            >
              {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Interactive Sector 7 Lab Viewport */}
        <div className="relative p-4 sm:p-6">
          {smokePuff && (
            <div className="pointer-events-none absolute inset-0 z-20 bg-rose-500/20 flex items-center justify-center">
              <span className="px-4 py-2 rounded-xl bg-rose-950 border border-rose-500 text-rose-200 font-mono text-sm font-bold">
                −20s TIME · −10% OXYGEN LEAK!
              </span>
            </div>
          )}

          {/* SVG Lab Scene with 5 Clickable Stations */}
          <div className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-[#071121]">
            <svg viewBox="0 0 960 400" className="w-full h-auto block">
              <defs>
                <linearGradient id="labWall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f1e36" />
                  <stop offset="100%" stopColor="#070e1c" />
                </linearGradient>
              </defs>
              <rect width="960" height="400" fill="url(#labWall)" />
              {/* Floor grid */}
              <polygon points="0,330 960,330 960,400 0,400" fill="#091325" />
              <line x1="0" y1="330" x2="960" y2="330" stroke="#1e3a5f" strokeWidth="2" />

              {/* Station 1: Periodic Wall Safe */}
              <g
                className="cursor-pointer"
                onClick={() => setActiveStation('periodic')}
              >
                <rect
                  x="34"
                  y="76"
                  width="154"
                  height="156"
                  rx="12"
                  fill={cyber.solvedStations.periodicSafe ? '#064e3b' : '#13233d'}
                  stroke={cyber.solvedStations.periodicSafe ? '#34d399' : '#38bdf8'}
                  strokeWidth="2.5"
                />
                <text x="111" y="106" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="800">
                  1. PERIODIC SAFE
                </text>
                <text x="111" y="128" textAnchor="middle" fill="#94a3b8" fontSize="11">
                  Inorganic Vault
                </text>
                <circle cx="111" cy="175" r="24" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                <text x="111" y="180" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="800">
                  {cyber.solvedStations.periodicSafe ? `#${cyber.digits[0]}` : 'LOCK'}
                </text>
              </g>

              {/* Station 2: Interactive Mixing Bench */}
              <g
                className="cursor-pointer"
                onClick={() => setActiveStation('mixing')}
              >
                <rect
                  x="212"
                  y="148"
                  width="174"
                  height="168"
                  rx="12"
                  fill={cyber.solvedStations.mixingBench ? '#064e3b' : '#13233d'}
                  stroke={cyber.solvedStations.mixingBench ? '#34d399' : '#22d3ee'}
                  strokeWidth="2.5"
                />
                <text x="299" y="178" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="800">
                  2. MIXING BENCH
                </text>
                <polygon
                  points="286,216 312,216 328,282 270,282"
                  fill={cyber.solvedStations.mixingBench ? '#10b981' : '#0ea5e9'}
                  fillOpacity="0.45"
                  stroke={cyber.solvedStations.mixingBench ? '#34d399' : '#38bdf8'}
                  strokeWidth="2"
                />
                <text x="299" y="304" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="700">
                  {cyber.solvedStations.mixingBench ? `EMERALD · #${cyber.digits[1]}` : 'Stoichiometry'}
                </text>
              </g>

              {/* Station 3: Fume Hood Synthesizer */}
              <g
                className="cursor-pointer"
                onClick={() => setActiveStation('fume')}
              >
                <rect
                  x="410"
                  y="74"
                  width="172"
                  height="182"
                  rx="12"
                  fill={cyber.solvedStations.fumeHood ? '#064e3b' : '#162925'}
                  stroke={cyber.solvedStations.fumeHood ? '#34d399' : '#a3e635'}
                  strokeWidth="2.5"
                />
                {!cyber.solvedStations.fumeHood && (
                  <rect x="424" y="128" width="144" height="92" rx="8" fill="#65a30d" fillOpacity="0.28" />
                )}
                <text x="496" y="104" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="800">
                  3. FUME HOOD
                </text>
                <text x="496" y="176" textAnchor="middle" fill="#d9f99d" fontSize="12" fontWeight="700">
                  {cyber.solvedStations.fumeHood ? `GAS CLEARED · #${cyber.digits[2]}` : '3-Step Organic'}
                </text>
              </g>

              {/* Station 4: Laser Grid Terminal */}
              <g
                className="cursor-pointer"
                onClick={() => setActiveStation('laser')}
              >
                <rect
                  x="606"
                  y="112"
                  width="156"
                  height="198"
                  rx="12"
                  fill={cyber.solvedStations.laserTerminal ? '#064e3b' : '#26111c'}
                  stroke={cyber.solvedStations.laserTerminal ? '#34d399' : '#f43f5e'}
                  strokeWidth="2.5"
                />
                {!cyber.solvedStations.laserTerminal && (
                  <>
                    <line x1="612" y1="166" x2="756" y2="188" stroke="#fb7185" strokeWidth="2.5" />
                    <line x1="612" y1="212" x2="756" y2="194" stroke="#fb7185" strokeWidth="2.5" />
                    <line x1="612" y1="248" x2="756" y2="262" stroke="#fb7185" strokeWidth="2.5" />
                  </>
                )}
                <text x="684" y="142" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="800">
                  4. LASER GRID
                </text>
                <text x="684" y="292" textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="700">
                  {cyber.solvedStations.laserTerminal ? `OFFLINE · #${cyber.digits[3]}` : 'Physical Keypad'}
                </text>
              </g>

              {/* Station 5: Hydraulic Blast Door */}
              <g
                className="cursor-pointer"
                onClick={() => setActiveStation('blast')}
              >
                <rect
                  x="784"
                  y="54"
                  width="148"
                  height="276"
                  rx="14"
                  fill={cyber.solvedStations.blastDoor ? '#059669' : '#1e293b'}
                  stroke={stationsDone === 4 ? '#C6FF00' : '#64748b'}
                  strokeWidth="3"
                />
                <text x="858" y="102" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">
                  5. BLAST DOOR
                </text>
                <text x="858" y="190" textAnchor="middle" fill="#C6FF00" fontSize="12" fontWeight="800">
                  {cyber.solvedStations.blastDoor ? 'OPEN!' : `${stationsDone}/4 DIGITS`}
                </text>
                <text x="858" y="216" textAnchor="middle" fill="#cbd5e1" fontSize="10.5">
                  Click to Override
                </text>
              </g>
            </svg>
          </div>

          {/* Station Action Quick Buttons + PrepsBot Guide */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'periodic' as const, label: '1. Periodic Safe', done: cyber.solvedStations.periodicSafe },
              { id: 'mixing' as const, label: '2. Mixing Bench', done: cyber.solvedStations.mixingBench },
              { id: 'fume' as const, label: '3. Fume Hood', done: cyber.solvedStations.fumeHood },
              { id: 'laser' as const, label: '4. Laser Terminal', done: cyber.solvedStations.laserTerminal },
              { id: 'blast' as const, label: '5. Blast Door', done: cyber.solvedStations.blastDoor },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                data-testid={`cyber-station-${st.id}`}
                onClick={() => setActiveStation(st.id)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  st.done
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 hover:border-cyan-400 text-slate-100'
                }`}
              >
                {st.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                {st.label}
              </button>
            ))}
          </div>

          {/* Floating PrepsBot Guide Bar */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-cyan-300">PrepsBot Guide:</strong> {prepsBotTip}
              </span>
            </div>
            <button
              type="button"
              disabled={cyber.hintsRemaining <= 0}
              onClick={handleUseSmartHint}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-300 text-xs font-bold disabled:opacity-40 shrink-0 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Hint ({cyber.hintsRemaining})
            </button>
          </div>
        </div>

        {/* Station Puzzle Modal */}
        {activeStation && cyber.status === 'playing' && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <h3 className="font-display font-bold text-lg text-white">
                  {activeStation === 'periodic' && 'Station 1 — Periodic Wall Safe'}
                  {activeStation === 'mixing' && 'Station 2 — Interactive Mixing Bench'}
                  {activeStation === 'fume' && 'Station 3 — Fume Hood Synthesizer'}
                  {activeStation === 'laser' && 'Station 4 — Laser Grid Terminal'}
                  {activeStation === 'blast' && 'Station 5 — Hydraulic Blast Door'}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveStation(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {activeStation === 'periodic' && (
                  <>
                    <p className="text-sm text-slate-200">{cyber.puzzles.periodic.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cyber.puzzles.periodic.options.map((opt, idx) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handlePeriodicAnswer(idx)}
                          className="p-3 rounded-xl bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-left text-sm font-semibold cursor-pointer"
                        >
                          {['A', 'B', 'C', 'D'][idx]}. {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {activeStation === 'mixing' && (
                  <>
                    <p className="text-sm text-slate-200">{cyber.puzzles.mixing.prompt}</p>
                    <div className="flex flex-wrap gap-2">
                      {cyber.puzzles.mixing.reagents.map((r, i) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedReagent(i)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                            selectedReagent === i
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                              : 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-emerald-300 text-center">
                      {cyber.puzzles.mixing.equationDisplay}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {cyber.puzzles.mixing.speciesLabels.map((lbl, idx) => (
                        <div key={lbl} className="p-3 rounded-xl bg-slate-800 text-center">
                          <div className="text-xs text-slate-400 mb-2">{lbl}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setMixCoeffs((prev) => {
                                  const next = [...prev] as [number, number, number];
                                  next[idx] = Math.max(1, next[idx] - 1);
                                  return next;
                                })
                              }
                              className="w-7 h-7 rounded-lg bg-slate-700 font-bold cursor-pointer"
                            >
                              −
                            </button>
                            <span className="font-mono text-base font-bold w-6">{mixCoeffs[idx]}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setMixCoeffs((prev) => {
                                  const next = [...prev] as [number, number, number];
                                  next[idx] = Math.min(9, next[idx] + 1);
                                  return next;
                                })
                              }
                              className="w-7 h-7 rounded-lg bg-slate-700 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleMixingSubmit}
                      className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm cursor-pointer"
                    >
                      Synthesize &amp; Balance Flask
                    </button>
                  </>
                )}

                {activeStation === 'fume' && (
                  <>
                    <div className="text-xs font-mono text-lime-400">
                      {cyber.puzzles.organic.title} · Step {organicStepIdx + 1} of 3
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {cyber.puzzles.organic.steps[organicStepIdx].stepLabel}:{' '}
                      {cyber.puzzles.organic.steps[organicStepIdx].prompt}
                    </p>
                    <div className="space-y-2">
                      {cyber.puzzles.organic.steps[organicStepIdx].options.map((opt, i) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleOrganicStepChoice(i)}
                          className="w-full p-3 rounded-xl bg-slate-800 hover:bg-lime-500/20 border border-slate-700 hover:border-lime-400 text-left text-sm font-semibold cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {activeStation === 'laser' && (
                  <>
                    <p className="text-sm text-slate-200">{cyber.puzzles.laser.question}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={laserInput}
                        onChange={(e) => setLaserInput(e.target.value)}
                        placeholder={`Enter value (${cyber.puzzles.laser.unit})`}
                        className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 font-mono text-base text-cyan-300"
                      />
                      <button
                        type="button"
                        onClick={handleLaserSubmit}
                        className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm cursor-pointer"
                      >
                        Disable Lasers
                      </button>
                    </div>
                  </>
                )}

                {activeStation === 'blast' && (
                  <>
                    <p className="text-xs text-slate-300">
                      Enter the 4-digit Sector 7 Passcode unlocked across Stations 1–4 and balance the final hydraulic override equation.
                    </p>
                    <input
                      type="text"
                      maxLength={4}
                      value={blastCodeInput}
                      onChange={(e) => setBlastCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="4-Digit Passcode"
                      className="w-full rounded-xl bg-slate-950 border border-cyan-500/40 px-4 py-3 font-mono text-xl tracking-[0.4em] text-center text-[#C6FF00]"
                    />
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 text-center">
                      {cyber.puzzles.override.equationDisplay}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {cyber.puzzles.override.speciesLabels.map((lbl, idx) => (
                        <div key={lbl} className="p-2.5 rounded-xl bg-slate-800 text-center">
                          <div className="text-[11px] text-slate-400 mb-1">{lbl}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setOverrideCoeffs((prev) => {
                                  const next = [...prev] as [number, number, number];
                                  next[idx] = Math.max(1, next[idx] - 1);
                                  return next;
                                })
                              }
                              className="w-6 h-6 rounded bg-slate-700 font-bold cursor-pointer"
                            >
                              −
                            </button>
                            <span className="font-mono font-bold">{overrideCoeffs[idx]}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setOverrideCoeffs((prev) => {
                                  const next = [...prev] as [number, number, number];
                                  next[idx] = Math.min(9, next[idx] + 1);
                                  return next;
                                })
                              }
                              className="w-6 h-6 rounded bg-slate-700 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleBlastDoorUnlock}
                      className="w-full py-3 rounded-xl bg-[#C6FF00] hover:bg-[#d8ff4d] text-slate-950 font-black text-sm cursor-pointer"
                    >
                      Open Hydraulic Blast Door
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Slide-Over Handwritten Formula & Hint Drawer */}
        {drawerOpen && (
          <div className="fixed inset-y-0 right-0 z-50 w-96 max-w-[90vw] bg-slate-950 border-l border-amber-500/40 p-5 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-display font-bold text-base text-amber-300">
                Handwritten Formula &amp; Hint Sheet
              </h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1.5 mt-3">
              {(['Physical', 'Organic', 'Inorganic'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFormulaTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    formulaTab === tab
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-200 font-mono leading-relaxed">
              {HANDWRITTEN_FORMULA_SHEETS[formulaTab].map((line) => (
                <li
                  key={line}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cyber-Lab Escaped / Failed Overlay */}
        {cyber.status !== 'playing' && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 text-center space-y-4">
              {cyber.status === 'escaped' ? (
                <>
                  <Trophy className="w-12 h-12 text-[#C6FF00] mx-auto" />
                  <h3 className="font-display text-3xl font-bold text-white">
                    Escaped Sector 7 — Rank {cyberReport.rank}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-slate-950">
                      <div className="text-slate-400">TIME LEFT</div>
                      <div className="text-amber-300 font-bold text-base">
                        {formatClock(cyber.timeRemainingSec)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950">
                      <div className="text-slate-400">ACCURACY</div>
                      <div className="text-emerald-300 font-bold text-base">
                        {cyberReport.accuracyPercent}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950">
                      <div className="text-slate-400">SCORE</div>
                      <div className="text-cyan-300 font-bold text-base">{cyber.score}</div>
                    </div>
                  </div>
                  <div className="text-left p-3.5 rounded-xl bg-slate-950 text-xs text-slate-300">
                    <div className="font-bold text-white mb-1.5">Concepts Mastered:</div>
                    {cyberReport.conceptsMastered.map((c) => (
                      <div key={c}>• {c}</div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                  <h3 className="font-display text-2xl font-bold text-rose-400">
                    Containment Breach
                  </h3>
                  <p className="text-sm text-slate-300">{cyber.failReason}</p>
                </>
              )}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCyberLab(cyberDifficulty)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6FF00] text-slate-950 font-black text-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Fresh Randomized Run
                </button>
                <button
                  type="button"
                  onClick={() => setEdition(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm cursor-pointer"
                >
                  Switch Edition
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // EDITION 2: KHANDAHAR (RUINED BUILDING)
  // ==========================================
  return (
    <div
      className={`relative rounded-3xl bg-[#130B08] border border-amber-500/35 overflow-hidden text-stone-100 ${
        shakeActive ? 'animate-pulse ring-4 ring-red-600' : ''
      }`}
    >
      {/* Top Khandahar HUD */}
      <div className="px-4 py-3 bg-[#1E110C] border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setEdition(null)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-amber-400">
              {khandahar.chamberTitle} · {khandahar.difficultyLabel}
            </p>
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums mt-0.5">
              <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                <Timer className="w-3.5 h-3.5" />
                C4 {formatClock(khandahar.timeRemainingSec)}
              </span>
              <span className="text-amber-300 font-bold">Score {khandahar.score}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => speakNarrator(lastSpokenRef.current || khandahar.chamberTitle)}
            className="px-3 py-1.5 rounded-xl bg-stone-800 text-amber-300 text-xs font-bold cursor-pointer"
          >
            Replay Voice
          </button>
          <button
            type="button"
            onClick={() => {
              const nextMuted = !voiceMuted;
              setVoiceMuted(nextMuted);
              if (nextMuted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            }}
            className="p-2 rounded-xl bg-stone-800 text-stone-200 cursor-pointer"
            aria-label="Toggle Voice Narrator"
          >
            {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Haunted Ruin Chamber + Trapped Child Survivor & 4 Nested Doors */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Live Voice-Over Subtitle Bar */}
        <div className="p-3 rounded-xl bg-stone-950/90 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{subtitleLine || 'Select a nested stone door to uncover the 4-digit C4 disarm code.'}</span>
        </div>

        {/* 4 Nested Doors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {khandahar.clues.map((clue, idx) => {
            const solved = khandahar.solvedSlots[idx];
            return (
              <button
                key={clue.doorName + idx}
                type="button"
                data-testid={`khandahar-door-${idx}`}
                onClick={() => handleSelectKhandaharDoor(idx)}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                  solved
                    ? 'bg-emerald-950/50 border-emerald-500/60'
                    : 'bg-stone-900/90 border-stone-700 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <DoorOpen
                    className={`w-6 h-6 ${solved ? 'text-emerald-400' : 'text-amber-400'}`}
                  />
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-950 text-amber-300">
                    Digit #{idx + 1}: {solved ? khandahar.unlockedDigits[idx] : '?'}
                  </span>
                </div>
                <div className="font-display font-bold text-sm text-white">
                  {clue.doorName}
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  {solved ? clue.concept : 'Click to inspect locked door & solve Chemistry clue'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Trapped Child Survivor + Explosive C4 Lock Keypad */}
        <div className="p-5 rounded-2xl bg-[#1D0F0B] border border-red-500/40 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-md">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-red-400">
              <AlertTriangle className="w-4 h-4" />
              TRAPPED CHILD SURVIVOR · LIVE C4 EXPLOSIVE LOCK
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Enter the exact 4-digit Chemistry disarm code revealed by the 4 nested doors. Warning: Entering a wrong code detonates the chamber immediately!
            </p>
            <div className="flex items-center gap-1.5 pt-1 font-mono text-xs">
              {khandahar.unlockedDigits.map((d, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-amber-300 font-bold"
                >
                  #{idx + 1}: {d !== null ? d : '_'}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <input
              data-testid="khandahar-c4-input"
              type="text"
              maxLength={4}
              value={c4CodeInput}
              onChange={(e) => setC4CodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              className="w-36 rounded-xl bg-stone-950 border border-red-500/50 px-3 py-2.5 font-mono text-xl tracking-[0.35em] text-center text-red-300"
            />
            <button
              type="button"
              data-testid="khandahar-disarm-btn"
              disabled={c4CodeInput.length < 4}
              onClick={handleDisarmC4}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-sm cursor-pointer"
            >
              DISARM C4
            </button>
          </div>
        </div>
      </div>

      {/* Nested Door Chemistry Question Modal */}
      {activeDoorSlot !== null && khandahar.status === 'playing' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-stone-900 border border-amber-500/45 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-display font-bold text-lg text-amber-300">
                {khandahar.clues[activeDoorSlot].doorName} — Digit #{activeDoorSlot + 1}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDoorSlot(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-stone-100">
              {khandahar.clues[activeDoorSlot].question}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {khandahar.clues[activeDoorSlot].options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleKhandaharClueAnswer(activeDoorSlot, idx)}
                  className="p-3 rounded-xl bg-stone-800 hover:bg-amber-500/20 border border-stone-700 hover:border-amber-400 text-left text-sm font-semibold cursor-pointer"
                >
                  {['A', 'B', 'C', 'D'][idx]}. {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detonated / Escaped Overlay */}
      {khandahar.status !== 'playing' && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            khandahar.status === 'detonated'
              ? 'bg-gradient-to-b from-red-950/95 via-orange-950/95 to-black/95'
              : 'bg-slate-950/90'
          }`}
        >
          <div className="w-full max-w-md rounded-3xl bg-stone-950 border border-amber-500/40 p-7 text-center space-y-4">
            {khandahar.status === 'detonated' ? (
              <>
                <Flame className="w-16 h-16 text-orange-500 mx-auto animate-bounce" />
                <h3 className="font-display text-3xl font-black text-red-500 tracking-tight">
                  BOOM! YOU ARE DEAD!
                </h3>
                <p className="text-sm text-stone-300">
                  The C4 lock detonated in {khandahar.chamberTitle}. Every restart generates a fresh randomized passcode and new Chemistry questions!
                </p>
              </>
            ) : (
              <>
                <Trophy className="w-14 h-14 text-[#C6FF00] mx-auto" />
                <h3 className="font-display text-2xl font-bold text-white">
                  Child Survivor Rescued!
                </h3>
                <p className="text-sm text-stone-300">
                  Cleared {khandahar.chamberTitle} · Score {khandahar.score}
                </p>
              </>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {khandahar.status === 'escaped' && khandahar.level < 3 && (
                <button
                  type="button"
                  onClick={() => startKhandahar((khandahar.level + 1) as 2 | 3)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-sm cursor-pointer"
                >
                  Enter Level {khandahar.level + 1}
                </button>
              )}
              <button
                type="button"
                onClick={() => startKhandahar(khandahar.level)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Fresh Randomized Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
