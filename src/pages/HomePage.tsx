import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Atom,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Dna,
  Flame,
  FlaskConical,
  Gamepad2,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sigma,
  Sparkles,
  Swords,
  Timer,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ChromaKeyMascotVideo } from '../components/hero/ChromaKeyMascotVideo';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { playClick, playNav } from '../utils/soundEffects';
import {
  GEMINI_VOICES,
  getPreferredGeminiVoice,
  setPreferredGeminiVoice,
  speakText,
  stopSpeaking,
  subscribeGeminiVoice,
  type GeminiVoiceName,
} from '../utils/speakText';

interface OrbitalTask {
  id: string;
  label: string;
  meta: string;
  bubble: string;
  voiceLine: string;
  accentBorder: string;
  dotColor: string;
}

const ORBITAL_TASKS: OrbitalTask[] = [
  {
    id: 'pyqs',
    label: '15 PYQs · Physics',
    meta: 'Electrostatics + Rotational',
    bubble: '15 PYQs done! Solid speed.',
    voiceLine: '15 PYQs done! Solid speed bhai, rotational mechanics pakka ho raha hai.',
    accentBorder: 'hover:border-[#00D4FF]/55',
    dotColor: 'bg-[#00D4FF]',
  },
  {
    id: 'focus',
    label: 'Focus Block · 25:00',
    meta: 'Zero-distraction Pomodoro',
    bubble: 'Focus block khatam! Zero distractions.',
    voiceLine: 'Focus block khatam! Zero distractions, ekdum topper rhythm hai.',
    accentBorder: 'hover:border-[#FF7A00]/55',
    dotColor: 'bg-[#FF7A00]',
  },
  {
    id: 'mock',
    label: 'Mock Analysis · NTA',
    meta: 'Error + Time breakdown',
    bubble: 'Mock analysis ready — 3 silly traps fixed!',
    voiceLine: 'Mock analysis ready hai! Teen silly traps pakad liye, next score jump karega.',
    accentBorder: 'hover:border-[#2563EB]/60',
    dotColor: 'bg-[#38BDF8]',
  },
  {
    id: 'arena',
    label: 'Apex Arena Duel',
    meta: 'Formula Clash · +150 XP',
    bubble: 'Apex Arena duel jeeta!',
    voiceLine: 'Apex Arena duel jeeta! 150 XP aur streak dono safe hain.',
    accentBorder: 'hover:border-[#FF7A00]/55',
    dotColor: 'bg-[#FF7A00]',
  },
];

const CYCLING_BUBBLES = [
  'Aaj ka target? 25 PYQs! 🔥',
  '15 PYQs done! Solid speed.',
  'Focus block khatam! Zero distractions.',
  'Apex Arena duel jeeta!',
];

const MARQUEE_ITEMS = [
  '100% Free Forever',
  'Authentic NTA CBT Mocks',
  'Handwritten Formula Sheets',
  'Preps AI Whiteboard Tutor',
  'Apex Arena',
  '1,00,000+ Practice Questions',
  '3,771 Mapped Concepts',
  'Chapter-Wise DPPs',
];

interface SpaceItem {
  num: string;
  id: string;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  to: string;
  ctaLabel: string;
  glowClass: string;
  accentColor: string;
  icon: typeof BookOpen;
  tools: { name: string; detail: string }[];
}

const FIVE_SPACES: SpaceItem[] = [
  {
    num: '01',
    id: 'materials',
    title: 'Study Materials & Handwritten Notes',
    shortTitle: 'Study Materials',
    tagline: 'Handwritten clarity, zero PDF hunting',
    description:
      'Chapter-wise handwritten notes, one-page formula sheets, NCERT line-to-PYQ maps, and inline timed DPPs crafted for JEE, NEET, and Class 9–12.',
    to: '/materials',
    ctaLabel: 'Open Study Materials',
    glowClass: 'obsidian-glow-cyan',
    accentColor: '#00D4FF',
    icon: BookOpen,
    tools: [
      { name: 'Handwritten Formula Sheets', detail: 'High-yield visual recall per chapter' },
      { name: 'Chapter-Wise DPPs', detail: 'Timed 10–15 question daily practice sets' },
      { name: 'NCERT-to-PYQ Mapper', detail: 'Direct exam links to textbook lines' },
    ],
  },
  {
    num: '02',
    id: 'mocks',
    title: 'Authentic NTA CBT Mock Tests',
    shortTitle: 'CBT Mock Tests',
    tagline: 'Exact exam-hall interface & marking',
    description:
      'Practice full-length JEE Main, JEE Advanced, and NEET papers with the official 15-bubble palette states, +4/-1 marking, and per-question time audits.',
    to: '/cbt-mocks',
    ctaLabel: 'Launch NTA CBT Mocks',
    glowClass: 'obsidian-glow-orange',
    accentColor: '#FF7A00',
    icon: ClipboardCheck,
    tools: [
      { name: 'Full-Syllabus NTA CBT', detail: 'Exact palette, review flags & timer' },
      { name: 'Custom Chapter Builder', detail: 'Mix any chapters into a quick mock' },
      { name: 'Mistake Notebook Sync', detail: 'Wrong answers auto-saved for retest' },
    ],
  },
  {
    num: '03',
    id: 'tutor',
    title: 'Preps AI Whiteboard Tutor',
    shortTitle: 'Preps AI Tutor',
    tagline: 'Live voice explanations & step-by-step ink',
    description:
      'Ask any Physics derivation, Organic mechanism, or Calculus doubt in English or Hinglish. Watch live handwritten board steps while PrepsBot speaks naturally.',
    to: '/preps-ai',
    ctaLabel: 'Open Preps AI Tutor',
    glowClass: 'obsidian-glow-blue',
    accentColor: '#38BDF8',
    icon: Sparkles,
    tools: [
      { name: 'Live Chalkboard Solver', detail: 'Step-by-step LaTeX & vector sketches' },
      { name: 'Natural Hinglish Voice', detail: 'Friendly peer-mentor explanations' },
      { name: 'Snap-a-Doubt Upload', detail: 'Solve textbook or PYQ photos fast' },
    ],
  },
  {
    num: '04',
    id: 'arena',
    title: 'Apex Arena Study Duels',
    shortTitle: 'Apex Arena',
    tagline: '10-second reflex drills that lock formulas',
    description:
      'Turn boring revision into crisp 10-second Formula Clash duels, Concept Link Rush, and Kaun Banega Topper rounds that wire speed under pressure.',
    to: '/arena',
    ctaLabel: 'Enter Apex Arena',
    glowClass: 'obsidian-glow-orange',
    accentColor: '#FF7A00',
    icon: Gamepad2,
    tools: [
      { name: 'Formula Clash 10s', detail: 'Rapid-fire JEE/NEET equation duels' },
      { name: 'Kaun Banega Topper', detail: 'Escalating exam-grade ladder' },
      { name: 'Syllabus Dominion', detail: 'Conquer chapters tile by tile' },
    ],
  },
  {
    num: '05',
    id: 'workspace',
    title: 'Obsidian Focus Workspace',
    shortTitle: 'Focus Workspace',
    tagline: 'Pomodoro blocks, streaks & mastery',
    description:
      'One calm study desk combining your 25-minute deep sprint timer, 5-stage chapter mastery tracker, daily targets, and distraction-free study blocks.',
    to: '/workspace',
    ctaLabel: 'Open Focus Workspace',
    glowClass: 'obsidian-glow-cyan',
    accentColor: '#00D4FF',
    icon: Layers,
    tools: [
      { name: '25:00 Deep Sprint Timer', detail: 'Structured Pomodoro focus sessions' },
      { name: '5-Stage Mastery Bar', detail: 'Track NCERT → Notes → DPP → PYQ → Mock' },
      { name: 'Daily Trifecta XP', detail: 'Build unstoppable exam-day consistency' },
    ],
  },
];

interface PyqSample {
  id: string;
  tag: string;
  question: string;
  options: { key: string; text: string }[];
  correctKey: string;
  solution: string;
}

const PYQ_SAMPLES: PyqSample[] = [
  {
    id: 'gauss-law',
    tag: 'JEE Main Physics · Gauss Law',
    question:
      'A point charge +q is placed at the exact centre of a cube of side a. What is the electric flux passing through any ONE face of the cube?',
    options: [
      { key: 'A', text: 'q / ε₀' },
      { key: 'B', text: 'q / 6ε₀' },
      { key: 'C', text: 'q / 24ε₀' },
    ],
    correctKey: 'B',
    solution:
      'By Gauss’s Law, total flux through all 6 symmetric faces is q/ε₀. By symmetry, flux through one face = q / 6ε₀.',
  },
  {
    id: 'sn1-carbocation',
    tag: 'NEET Organic Chem · SN1',
    question:
      'Which alkyl halide reacts fastest via the SN1 mechanism in polar protic solvent (aqueous ethanol)?',
    options: [
      { key: 'A', text: '(CH₃)₃C–Br' },
      { key: 'B', text: 'CH₃CH₂–Br' },
      { key: 'C', text: 'CH₃–Br' },
    ],
    correctKey: 'A',
    solution:
      'SN1 rate depends on carbocation stability: 3° (CH₃)₃C⁺ is stabilized by 9 hyperconjugating α-H atoms, so it reacts fastest.',
  },
  {
    id: 'definite-integral',
    tag: 'JEE Main Maths · King’s Property',
    question:
      'Evaluate ∫₀^(π/2) [ sin x / (sin x + cos x) ] dx using King’s property:',
    options: [
      { key: 'A', text: 'π / 2' },
      { key: 'B', text: 'π / 4' },
      { key: 'C', text: '1' },
    ],
    correctKey: 'B',
    solution:
      'Replacing x with (π/2 − x) swaps sin x and cos x. Adding 2I = ∫₀^(π/2) 1 dx = π/2 ⇒ I = π/4.',
  },
];

interface FormulaDuelItem {
  id: string;
  prompt: string;
  subject: string;
  options: string[];
  answer: string;
}

const FORMULA_DUELS: FormulaDuelItem[] = [
  {
    id: 'escape-v',
    prompt: 'Escape velocity from Earth’s surface (radius R):',
    subject: 'Gravitation',
    options: ['√(gR)', '√(2gR)', '2√(gR)'],
    answer: '√(2gR)',
  },
  {
    id: 'de-broglie',
    prompt: 'de Broglie wavelength for momentum p:',
    subject: 'Modern Physics',
    options: ['h / p', 'h · p', 'p / h'],
    answer: 'h / p',
  },
  {
    id: 'nernst',
    prompt: 'Standard Nernst factor (2.303 RT / F) at 298 K:',
    subject: 'Electrochemistry',
    options: ['0.0295 V', '0.0591 V', '0.118 V'],
    answer: '0.0591 V',
  },
  {
    id: 'quadratic',
    prompt: 'Sum of roots (α + β) of ax² + bx + c = 0:',
    subject: 'Algebra',
    options: ['−b / a', 'c / a', 'b / a'],
    answer: '−b / a',
  },
];

type PaletteStatus = 'unanswered' | 'answered' | 'marked' | 'skipped';

const INITIAL_PALETTE: PaletteStatus[] = [
  'answered',
  'answered',
  'answered',
  'marked',
  'answered',
  'skipped',
  'answered',
  'unanswered',
  'marked',
  'answered',
  'unanswered',
  'unanswered',
  'answered',
  'skipped',
  'unanswered',
];

const PALETTE_CYCLE: Record<PaletteStatus, PaletteStatus> = {
  unanswered: 'answered',
  answered: 'marked',
  marked: 'skipped',
  skipped: 'unanswered',
};

const MASTERY_STAGES = [
  { id: 'ncert', label: 'NCERT' },
  { id: 'notes', label: 'Notes' },
  { id: 'dpp', label: 'DPP' },
  { id: 'pyqs', label: 'PYQs' },
  { id: 'mock', label: 'Mock' },
];

const DAILY_TRIFECTA = [
  { id: 't1', label: 'Solve 15 Electrostatics PYQs', xp: 50 },
  { id: 't2', label: 'Revise Organic Named Reactions', xp: 50 },
  { id: 't3', label: 'Finish 1 Timed 25m Focus Block', xp: 50 },
];

const SUBJECT_TRACKS = [
  {
    id: 'physics',
    title: 'Physics',
    subtitle: 'Mechanics, Electrodynamics, Optics & Modern Physics',
    chapters: '28 Chapters · 340+ Formula Cards',
    color: '#00D4FF',
    glowClass: 'obsidian-glow-cyan',
    icon: Atom,
    to: '/materials?subject=Physics',
  },
  {
    id: 'chemistry',
    title: 'Chemistry',
    subtitle: 'Physical Numericals, Organic Mechanisms & NCERT Inorganic',
    chapters: '30 Chapters · Reaction Maps',
    color: '#FF7A00',
    glowClass: 'obsidian-glow-orange',
    icon: FlaskConical,
    to: '/materials?subject=Chemistry',
  },
  {
    id: 'maths',
    title: 'Mathematics',
    subtitle: 'Calculus, Coordinate Geometry, Algebra & Vectors 3D',
    chapters: '26 Chapters · Short-Cut Tricks',
    color: '#38BDF8',
    glowClass: 'obsidian-glow-blue',
    icon: Sigma,
    to: '/materials?subject=Mathematics',
  },
  {
    id: 'biology',
    title: 'Biology',
    subtitle: 'Line-by-Line NCERT Botany, Human Physiology & Genetics',
    chapters: '32 Chapters · NEET High-Yield',
    color: '#10B981',
    glowClass: 'obsidian-glow-emerald',
    icon: Dna,
    to: '/materials?subject=Biology',
  },
];

export function HomePage() {
  const { openOnboardingModal } = useAuth();

  // Hero PrepBot Interactive Stage state
  const [completedTasks, setCompletedTasks] = useState<string[]>(['pyqs']);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [customBubble, setCustomBubble] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<GeminiVoiceName>(() => getPreferredGeminiVoice());

  // Five Spaces switcher state
  const [activeSpaceId, setActiveSpaceId] = useState<string>(FIVE_SPACES[0].id);

  // Bento 1: PYQ Quick-Check state
  const [pyqIdx, setPyqIdx] = useState(0);
  const [selectedPyqKey, setSelectedPyqKey] = useState<string | null>(null);

  // Bento 2: 25m Deep Sprint Timer state
  const [sprintSeconds, setSprintSeconds] = useState(25 * 60);
  const [sprintRunning, setSprintRunning] = useState(false);

  // Bento 3: 10s Apex Arena Formula Duel state
  const [duelIdx, setDuelIdx] = useState(0);
  const [duelTimeLeft, setDuelTimeLeft] = useState(10);
  const [duelActive, setDuelActive] = useState(false);
  const [duelStreak, setDuelStreak] = useState(2);
  const [duelFeedback, setDuelFeedback] = useState<'idle' | 'correct' | 'wrong' | 'timeout'>('idle');

  // Bento 4: 15-Bubble NTA CBT Palette state
  const [palette, setPalette] = useState<PaletteStatus[]>(INITIAL_PALETTE);

  // Bento 5: 5-Stage Chapter Mastery state
  const [masteryDone, setMasteryDone] = useState<string[]>(['ncert', 'notes', 'dpp']);

  // Bento 6: Daily Trifecta state
  const [trifectaDone, setTrifectaDone] = useState<string[]>(['t1']);

  // Cycle Hinglish speech bubbles automatically when idle
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCustomBubble(null);
      setBubbleIndex((prev) => (prev + 1) % CYCLING_BUBBLES.length);
    }, 4200);
    return () => window.clearInterval(interval);
  }, []);

  // Sync selected Gemini voice across pages & stop speech cleanly on unmount
  useEffect(() => {
    const unsub = subscribeGeminiVoice(setSelectedVoice);
    return () => {
      unsub();
      stopSpeaking();
    };
  }, []);

  // 25m Deep Sprint countdown
  useEffect(() => {
    if (!sprintRunning) return;
    const id = window.setInterval(() => {
      setSprintSeconds((prev) => {
        if (prev <= 1) {
          setSprintRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [sprintRunning]);

  // 10s Formula Duel live countdown
  useEffect(() => {
    if (!duelActive || duelFeedback !== 'idle') return;
    const id = window.setInterval(() => {
      setDuelTimeLeft((prev) => {
        if (prev <= 1) {
          setDuelActive(false);
          setDuelFeedback('timeout');
          setDuelStreak(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [duelActive, duelFeedback]);

  const activeBubbleText = customBubble ?? CYCLING_BUBBLES[bubbleIndex];
  const activeSpace = FIVE_SPACES.find((s) => s.id === activeSpaceId) ?? FIVE_SPACES[0];
  const currentPyq = PYQ_SAMPLES[pyqIdx];
  const currentDuel = FORMULA_DUELS[duelIdx];

  const triggerBuddySpeech = (line: string, forceSpeak = false, overrideVoice?: GeminiVoiceName) => {
    if (!voiceEnabled && !forceSpeak) return;
    void speakText(line, {
      language: 'hinglish',
      voiceName: overrideVoice ?? selectedVoice,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleSelectGeminiVoice = (nextVoice: GeminiVoiceName) => {
    playClick();
    const saved = setPreferredGeminiVoice(nextVoice);
    setSelectedVoice(saved);
    if (voiceEnabled) {
      triggerBuddySpeech(`Hey! ${saved} voice ready hai. Chalo Pure Rank ke liye padhte hain!`, true, saved);
    }
  };

  const handleToggleVoice = () => {
    playClick();
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopSpeaking();
        setIsSpeaking(false);
      }
      return next;
    });
  };

  const handleHearBuddy = () => {
    playClick();
    const spokenLine =
      customBubble ||
      'Namaste champion! Aaj ka target hai 25 PYQs aur ek focus block. Chalo Pure Rank ke liye shuru karte hain!';
    if (!voiceEnabled) setVoiceEnabled(true);
    triggerBuddySpeech(spokenLine, true);
  };

  const handleToggleOrbitalTask = (task: OrbitalTask) => {
    playClick();
    setCompletedTasks((prev) => {
      const alreadyDone = prev.includes(task.id);
      const next = alreadyDone ? prev.filter((id) => id !== task.id) : [...prev, task.id];
      if (!alreadyDone) {
        setCustomBubble(task.bubble);
        triggerBuddySpeech(task.voiceLine);
      }
      return next;
    });
  };

  const handlePyqChoice = (key: string) => {
    playClick();
    setSelectedPyqKey(key);
    const isCorrect = key === currentPyq.correctKey;
    if (isCorrect) {
      setCustomBubble('Sahi pakda! +4 marks locked 🔥');
      triggerBuddySpeech('Sahi pakda! Plus four marks locked, badhiya concept hai.');
    } else {
      setCustomBubble('Close! Solution dekho aur note karo.');
      triggerBuddySpeech('Koi baat nahi, niche solution dekho aur mistake notebook mein note kar lo.');
    }
  };

  const handleNextPyq = () => {
    playClick();
    setSelectedPyqKey(null);
    setPyqIdx((prev) => (prev + 1) % PYQ_SAMPLES.length);
  };

  const handleStartDuel = () => {
    playClick();
    setDuelTimeLeft(10);
    setDuelFeedback('idle');
    setDuelActive(true);
  };

  const handleAnswerDuel = (opt: string) => {
    playClick();
    if (!duelActive && duelFeedback === 'idle') {
      setDuelActive(true);
    }
    if (opt === currentDuel.answer) {
      setDuelFeedback('correct');
      setDuelStreak((s) => s + 1);
      setDuelActive(false);
      triggerBuddySpeech('Super fast! Formula streak badh gayi!');
    } else {
      setDuelFeedback('wrong');
      setDuelStreak(0);
      setDuelActive(false);
    }
  };

  const handleNextDuel = () => {
    playClick();
    setDuelIdx((prev) => (prev + 1) % FORMULA_DUELS.length);
    setDuelTimeLeft(10);
    setDuelFeedback('idle');
    setDuelActive(true);
  };

  const handleCyclePalette = (idx: number) => {
    playClick();
    setPalette((prev) => prev.map((st, i) => (i === idx ? PALETTE_CYCLE[st] : st)));
  };

  const handleToggleMastery = (stageId: string) => {
    playClick();
    setMasteryDone((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };

  const handleToggleTrifecta = (taskId: string) => {
    playClick();
    setTrifectaDone((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Derived metrics
  const sprintMins = String(Math.floor(sprintSeconds / 60)).padStart(2, '0');
  const sprintSecs = String(sprintSeconds % 60).padStart(2, '0');
  const sprintProgress = 1 - sprintSeconds / (25 * 60);
  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - sprintProgress);

  const masteryPercent = Math.round((masteryDone.length / MASTERY_STAGES.length) * 100);
  const trifectaXp = trifectaDone.length * 50;
  const answeredCount = palette.filter((s) => s === 'answered').length;
  const markedCount = palette.filter((s) => s === 'marked').length;

  return (
    <PageLayout>
      <SeoHead
        title="prepskm.in — One Desk for JEE & NEET. Zero Chaos. Pure Rank."
        description="Handwritten notes, chapter-wise DPPs, authentic NTA CBT mocks, Apex Arena duels, and a live Preps AI whiteboard tutor — 100% free forever."
        canonicalPath="/"
      />

      {/* =====================================================================
          HERO SECTION — Deep Obsidian + Airy Glows + 3D Chroma-Key Robot Stage
         ===================================================================== */}
      <section className="relative overflow-hidden pt-10 pb-14 lg:pt-14 lg:pb-20">
        {/* Soft airy ambient glows behind hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -left-24 w-[460px] h-[460px] rounded-full blur-[120px] opacity-25"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-12 right-0 w-[500px] h-[500px] rounded-full blur-[130px] opacity-25"
          style={{ background: 'radial-gradient(circle, #00D4FF 0%, transparent 72%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 w-[440px] h-[440px] rounded-full blur-[130px] opacity-20"
          style={{ background: 'radial-gradient(circle, #FF7A00 0%, transparent 72%)' }}
        />

        <ResponsiveContainer>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* LEFT COLUMN: Slogan, Subheadline, CTAs & Stats */}
            <div className="lg:col-span-6 space-y-6">
              {/* Hero Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B1120]/90 border border-[#00D4FF]/30 text-[#00D4FF] text-sm tracking-wide shadow-[0_0_24px_rgba(0,212,255,0.12)]">
                <span className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
                <span>JEE, NEET &amp; Class 9–12 • 100% Free Forever</span>
              </div>

              {/* Main Hero Slogan */}
              <h1 className="font-display text-4xl sm:text-[2.95rem] xl:text-[3.2rem] font-bold leading-[1.12] tracking-tight text-[#F8FAFC]">
                <span className="block sm:whitespace-nowrap">One desk for JEE &amp; NEET.</span>
                <span className="block text-[#94A3B8]">Zero chaos.</span>
                <span className="relative inline-block mt-1">
                  <span className="bg-gradient-to-r from-[#FF7A00] via-[#FF9E3D] to-[#00D4FF] bg-clip-text text-transparent">
                    Pure Rank.
                  </span>
                  {/* Custom Hand-Drawn SVG Brush Underline */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 260 18"
                    fill="none"
                    className="w-full h-4 -mt-1.5 overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M3 13C56 4.5 148 3 257 10.5"
                      stroke="url(#pureRankBrush)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16 15.5C94 11 174 9.5 244 14"
                      stroke="#FF7A00"
                      strokeOpacity="0.45"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="pureRankBrush" x1="3" y1="10" x2="257" y2="10" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FF7A00" />
                        <stop offset="0.6" stopColor="#FF9E3D" />
                        <stop offset="1" stopColor="#00D4FF" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl leading-relaxed text-[#94A3B8] max-w-xl">
                Handwritten notes, chapter-wise DPPs, authentic NTA CBT mocks, Apex Arena duels, and a live Preps AI
                whiteboard tutor — all 100% free inside one obsidian workspace.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    openOnboardingModal();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#FF7A00] hover:bg-[#F97316] text-[#060A14] font-display text-lg font-bold shadow-[0_12px_32px_rgba(255,122,0,0.34)] transition-all hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <a
                  href="#five-spaces"
                  onClick={() => playNav()}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0B1120]/80 hover:bg-[#142038] text-[#F8FAFC] border border-slate-400/20 hover:border-[#00D4FF]/45 font-display text-lg font-bold backdrop-blur-md transition-all whitespace-nowrap"
                >
                  <span>See What&apos;s Inside</span>
                </a>
              </div>

              {/* Clean Metric Strip */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-400/15 max-w-lg">
                <div>
                  <p className="font-mono text-xl sm:text-2xl font-bold text-[#F8FAFC] tabular-nums">1,00,000+</p>
                  <p className="text-sm text-[#94A3B8]">Practice Questions</p>
                </div>
                <div>
                  <p className="font-mono text-xl sm:text-2xl font-bold text-[#00D4FF] tabular-nums">3,771</p>
                  <p className="text-sm text-[#94A3B8]">Mapped Concepts</p>
                </div>
                <div>
                  <p className="font-mono text-xl sm:text-2xl font-bold text-[#FF7A00] tabular-nums">100%</p>
                  <p className="text-sm text-[#94A3B8]">Free Forever</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 3D Chroma-Keyed Mascot Stage + Speech Bubble + 4 Interactive Task Cards */}
            <div className="lg:col-span-6">
              <div className="relative obsidian-card rounded-3xl p-5 sm:p-6 border border-slate-400/15 overflow-hidden">
                {/* Subtle radial interior aura */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 38%, rgba(0, 212, 255, 0.14), rgba(37, 99, 235, 0.08) 45%, transparent 74%)',
                  }}
                />

                {/* Top Control Strip: Live Speech Bubble + Voice Mute/Unmute & Hear Buddy */}
                <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#060A14]/85 border border-[#00D4FF]/30 max-w-xs sm:max-w-sm shadow-lg"
                    data-testid="prepbot-speech-bubble"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isSpeaking ? 'bg-[#FF7A00] animate-ping' : 'bg-[#00D4FF]'
                      }`}
                    />
                    <motion.p
                      key={activeBubbleText}
                      initial={{ opacity: 0.65, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                      className="text-base text-[#F8FAFC] leading-snug"
                    >
                      {activeBubbleText}
                    </motion.p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="home-gemini-voice-select">
                      Select Gemini Voice
                    </label>
                    <select
                      id="home-gemini-voice-select"
                      aria-label="Gemini Voice"
                      value={selectedVoice}
                      onChange={(e) => handleSelectGeminiVoice(e.target.value as GeminiVoiceName)}
                      className="h-9 px-2.5 rounded-xl bg-[#060A14]/90 border border-[#00D4FF]/35 text-[#E2E8F0] text-xs font-mono font-semibold focus:border-[#00D4FF] focus:outline-none"
                    >
                      {GEMINI_VOICES.map((voice) => (
                        <option key={voice.id} value={voice.id} className="bg-[#0B1120] text-[#F8FAFC]">
                          Gemini: {voice.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleHearBuddy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF7A00]/15 hover:bg-[#FF7A00]/25 border border-[#FF7A00]/45 text-[#FF9E3D] text-sm font-bold transition-colors whitespace-nowrap"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isSpeaking ? 'Speaking...' : 'Hear Buddy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      aria-label={voiceEnabled ? 'Mute PrepBot voice' : 'Unmute PrepBot voice'}
                      title={voiceEnabled ? 'Voice On (click to mute)' : 'Voice Off (click to unmute)'}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${
                        voiceEnabled
                          ? 'bg-[#00D4FF]/15 border-[#00D4FF]/45 text-[#00D4FF]'
                          : 'bg-[#0B1120] border-slate-500/30 text-[#94A3B8]'
                      }`}
                    >
                      {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Central Stage: 3D Chroma-Keyed Muted AI Robot Video + 4 Orbiting Clickable Cards */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 items-center gap-3 py-1">
                  {/* Left 2 Orbiting Cards */}
                  <div className="sm:col-span-4 space-y-3 order-2 sm:order-1">
                    {ORBITAL_TASKS.slice(0, 2).map((task) => {
                      const done = completedTasks.includes(task.id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleToggleOrbitalTask(task)}
                          aria-pressed={done}
                          className={`w-full text-left p-3 rounded-2xl border backdrop-blur-md transition-all duration-200 ${
                            done
                              ? 'bg-[#0E1A30]/95 border-[#00D4FF]/55 shadow-[0_0_20px_rgba(0,212,255,0.14)]'
                              : `bg-[#0B1120]/85 border-slate-400/15 ${task.accentBorder}`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-bold text-[#F8FAFC] leading-tight">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${task.dotColor}`} />
                              <span>{task.label}</span>
                            </span>
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                                done
                                  ? 'bg-[#FF7A00] border-[#FF7A00] text-[#060A14]'
                                  : 'border-slate-500/40 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          </div>
                          <p className="text-xs text-[#94A3B8] mt-1 pl-4">{task.meta}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Center Transparent 3D Chroma-Key Mascot Video */}
                  <div className="sm:col-span-4 flex justify-center order-1 sm:order-2">
                    <ChromaKeyMascotVideo src="/video_1.mp4" onClick={handleHearBuddy} />
                  </div>

                  {/* Right 2 Orbiting Cards */}
                  <div className="sm:col-span-4 space-y-3 order-3">
                    {ORBITAL_TASKS.slice(2, 4).map((task) => {
                      const done = completedTasks.includes(task.id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleToggleOrbitalTask(task)}
                          aria-pressed={done}
                          className={`w-full text-left p-3 rounded-2xl border backdrop-blur-md transition-all duration-200 ${
                            done
                              ? 'bg-[#0E1A30]/95 border-[#FF7A00]/55 shadow-[0_0_20px_rgba(255,122,0,0.14)]'
                              : `bg-[#0B1120]/85 border-slate-400/15 ${task.accentBorder}`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-bold text-[#F8FAFC] leading-tight">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${task.dotColor}`} />
                              <span>{task.label}</span>
                            </span>
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                                done
                                  ? 'bg-[#FF7A00] border-[#FF7A00] text-[#060A14]'
                                  : 'border-slate-500/40 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          </div>
                          <p className="text-xs text-[#94A3B8] mt-1 pl-4">{task.meta}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Progress Bar ("X / 4 done today") */}
                <div className="relative z-20 mt-4 pt-3.5 border-t border-slate-400/15">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[#94A3B8]">Tap cards to check off today&apos;s momentum</span>
                    <span
                      data-testid="daily-progress-label"
                      className="font-mono text-xs font-bold text-[#00D4FF] tabular-nums"
                    >
                      {completedTasks.length} / {ORBITAL_TASKS.length} done today
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#060A14] overflow-hidden border border-slate-400/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF9E3D] to-[#00D4FF] transition-all duration-300"
                      style={{ width: `${(completedTasks.length / ORBITAL_TASKS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* =====================================================================
          INFINITE SMOOTH MARQUEE BAR
         ===================================================================== */}
      <div className="border-y border-slate-400/15 bg-[#0B1120]/80 backdrop-blur-md py-3.5 overflow-hidden">
        <div className="preps-marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center shrink-0">
              {MARQUEE_ITEMS.map((item) => (
                <div
                  key={`${dup}-${item}`}
                  className="inline-flex items-center gap-3 px-6 text-base sm:text-lg text-[#F8FAFC] whitespace-nowrap"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF7A00]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          INTERACTIVE "FIVE SPACES" SPLIT SECTION
         ===================================================================== */}
      <section id="five-spaces" className="py-16 lg:py-20">
        <ResponsiveContainer>
          <div className="max-w-2xl mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#00D4FF] mb-2">
              Inside Your Obsidian Desk
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8FAFC]">
              Five focused spaces. <span className="hand-underscore">Zero tab fatigue.</span>
            </h2>
            <p className="text-lg text-[#94A3B8] mt-3">
              Every tool you switch between during JEE &amp; NEET prep now lives under one fast keyboard-friendly roof.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Selector List */}
            <div className="lg:col-span-5 flex flex-col gap-2.5" role="tablist" aria-label="Five study spaces">
              {FIVE_SPACES.map((space) => {
                const Icon = space.icon;
                const active = space.id === activeSpace.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      playClick();
                      setActiveSpaceId(space.id);
                    }}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      active
                        ? 'bg-[#0E1A30] border-[#00D4FF]/50 shadow-[0_12px_30px_rgba(0,212,255,0.12)]'
                        : 'bg-[#0B1120]/70 border-slate-400/12 hover:border-slate-400/30 hover:bg-[#0E1526]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                        style={{
                          backgroundColor: active ? `${space.accentColor}22` : 'rgba(15, 23, 42, 0.8)',
                          color: active ? space.accentColor : '#94A3B8',
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-lg font-bold text-[#F8FAFC] truncate">{space.shortTitle}</p>
                        <p className="text-sm text-[#94A3B8] truncate">{space.tagline}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#94A3B8] shrink-0">{space.num}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Active Space Showcase Panel */}
            <div className="lg:col-span-7">
              <motion.div
                key={activeSpace.id}
                initial={{ opacity: 0.6, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16 }}
                role="tabpanel"
                className={`h-full obsidian-card ${activeSpace.glowClass} rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6`}
              >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span
                        className="font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg border"
                        style={{
                          color: activeSpace.accentColor,
                          borderColor: `${activeSpace.accentColor}45`,
                          backgroundColor: `${activeSpace.accentColor}14`,
                        }}
                      >
                        Space {activeSpace.num}
                      </span>
                      <span className="text-sm text-[#94A3B8]">100% Free Access</span>
                    </div>

                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                      {activeSpace.title}
                    </h3>
                    <p className="text-lg text-[#94A3B8] mt-2.5 leading-relaxed">{activeSpace.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                      {activeSpace.tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="rounded-2xl bg-[#060A14]/75 border border-slate-400/15 p-3.5"
                        >
                          <p className="font-display text-base font-bold text-[#F8FAFC] leading-snug">{tool.name}</p>
                          <p className="text-sm text-[#94A3B8] mt-1 leading-snug">{tool.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-400/15 flex items-center justify-between gap-4">
                    <span className="text-sm text-[#94A3B8]">No credit card · No paywall</span>
                    <Link
                      to={activeSpace.to}
                      onClick={() => playNav()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#F97316] text-[#060A14] font-display text-base font-bold transition-colors whitespace-nowrap"
                    >
                      <span>{activeSpace.ctaLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
              </motion.div>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* =====================================================================
          6 INTERACTIVE BENTO GRID WIDGETS (Real JEE/NEET Interactive Previews)
         ===================================================================== */}
      <section id="interactive-lab" className="py-14 lg:py-20 border-t border-slate-400/10">
        <ResponsiveContainer>
          <div className="max-w-2xl mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#FF7A00] mb-2">
              Try It Live Right Here
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8FAFC]">
              Built to feel like your <span className="hand-underscore-blue">real study desk.</span>
            </h2>
            <p className="text-lg text-[#94A3B8] mt-2.5">
              Every card below is interactive — test a PYQ, spin up a 25-minute focus sprint, or beat the 10-second
              formula clock.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* WIDGET 1: PYQ QUICK-CHECK */}
            <article className="obsidian-card obsidian-glow-cyan rounded-3xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-[#00D4FF] uppercase tracking-wider">
                    PYQ Quick-Check
                  </span>
                  <span className="font-mono text-xs text-[#94A3B8] tabular-nums">
                    {pyqIdx + 1} / {PYQ_SAMPLES.length}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#FF9E3D] mb-1.5">{currentPyq.tag}</p>
                <h3 className="font-display text-xl font-bold text-[#F8FAFC] leading-snug">{currentPyq.question}</h3>

                <div className="space-y-2 mt-4">
                  {currentPyq.options.map((opt) => {
                    const isSelected = selectedPyqKey === opt.key;
                    const isRight = opt.key === currentPyq.correctKey;
                    let stateClasses = 'bg-[#060A14]/75 border-slate-400/20 text-[#F8FAFC] hover:border-[#00D4FF]/55';
                    if (selectedPyqKey) {
                      if (isRight) {
                        stateClasses = 'bg-emerald-500/20 border-emerald-400 text-emerald-200';
                      } else if (isSelected) {
                        stateClasses = 'bg-rose-500/20 border-rose-400 text-rose-200';
                      }
                    }

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handlePyqChoice(opt.key)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center gap-3 text-base ${stateClasses}`}
                      >
                        <span className="font-mono text-xs font-bold w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          {opt.key}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedPyqKey && (
                  <div
                    data-testid="pyq-solution-box"
                    className="mt-3 p-3 rounded-xl bg-[#060A14]/90 border border-[#00D4FF]/30 text-sm text-[#CBD5E1]"
                  >
                    <span className="font-bold text-[#00D4FF]">
                      {selectedPyqKey === currentPyq.correctKey ? 'Correct (+4)! ' : 'Solution: '}
                    </span>
                    {currentPyq.solution}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-400/15">
                <button
                  type="button"
                  onClick={handleNextPyq}
                  className="text-sm font-bold text-[#00D4FF] hover:text-[#38BDF8] inline-flex items-center gap-1"
                >
                  <span>Next PYQ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <Link to="/dpp" onClick={() => playNav()} className="text-sm text-[#94A3B8] hover:text-[#F8FAFC]">
                  Full DPP Bank →
                </Link>
              </div>
            </article>

            {/* WIDGET 2: 25M DEEP SPRINT TIMER */}
            <article className="obsidian-card obsidian-glow-orange rounded-3xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#FF7A00] uppercase tracking-wider inline-flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    25m Deep Sprint
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8]">
                    {sprintRunning ? 'FOCUS LIVE' : 'READY'}
                  </span>
                </div>

                <div className="flex items-center gap-5 my-4">
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r={ringRadius} stroke="rgba(148,163,184,0.18)" strokeWidth="6" fill="none" />
                      <circle
                        cx="44"
                        cy="44"
                        r={ringRadius}
                        stroke="url(#sprintGrad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className="transition-all duration-300"
                      />
                      <defs>
                        <linearGradient id="sprintGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#FF7A00" />
                          <stop offset="100%" stopColor="#00D4FF" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span
                      data-testid="sprint-timer-display"
                      className="absolute font-mono text-lg font-bold text-[#F8FAFC] tabular-nums"
                    >
                      {sprintMins}:{sprintSecs}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-display text-2xl font-bold text-[#F8FAFC]">Pomodoro Desk</h3>
                    <p className="text-sm text-[#94A3B8] leading-snug">
                      Lock in 25 minutes of uninterrupted PYQs or NCERT revision.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setSprintRunning((r) => !r);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#F97316] text-[#060A14] font-display text-base font-bold transition-colors"
                  >
                    {sprintRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{sprintRunning ? 'Pause Sprint' : 'Start Sprint'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setSprintRunning(false);
                      setSprintSeconds(25 * 60);
                    }}
                    aria-label="Reset 25 minute sprint timer"
                    className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#060A14]/80 border border-slate-400/20 text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#00D4FF]/45 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-400/15 text-sm">
                <span className="text-[#94A3B8]">Zero-phone mode</span>
                <Link to="/workspace" onClick={() => playNav()} className="font-bold text-[#FF7A00] hover:underline">
                  Open Full Workspace →
                </Link>
              </div>
            </article>

            {/* WIDGET 3: 10S APEX ARENA FORMULA DUEL */}
            <article className="obsidian-card obsidian-glow-blue rounded-3xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#38BDF8] uppercase tracking-wider inline-flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" />
                    10s Formula Duel
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="duel-streak"
                      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#FF7A00] tabular-nums"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {duelStreak} streak
                    </span>
                    <span
                      data-testid="duel-timer"
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${
                        duelTimeLeft <= 3
                          ? 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
                          : 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30'
                      }`}
                    >
                      {duelTimeLeft}s
                    </span>
                  </div>
                </div>

                <p className="text-xs font-mono text-[#94A3B8] mb-1">{currentDuel.subject}</p>
                <h3 className="font-display text-xl font-bold text-[#F8FAFC] leading-snug">{currentDuel.prompt}</h3>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {currentDuel.options.map((opt) => {
                    const isAns = opt === currentDuel.answer;
                    let cls = 'bg-[#060A14]/75 border-slate-400/20 text-[#F8FAFC] hover:border-[#00D4FF]/55';
                    if (duelFeedback !== 'idle' && isAns) {
                      cls = 'bg-emerald-500/25 border-emerald-400 text-emerald-200';
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswerDuel(opt)}
                        className={`px-2.5 py-2.5 rounded-xl border font-mono text-sm font-bold transition-all ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 min-h-[28px]">
                  {duelFeedback === 'idle' ? (
                    <button
                      type="button"
                      onClick={handleStartDuel}
                      className="text-sm font-bold text-[#00D4FF] hover:underline inline-flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{duelActive ? 'Clock running — tap fast!' : 'Start 10s Clock'}</span>
                    </button>
                  ) : (
                    <>
                      <span
                        className={`text-sm font-bold ${
                          duelFeedback === 'correct' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {duelFeedback === 'correct'
                          ? 'Bullseye! Streak +1'
                          : duelFeedback === 'timeout'
                            ? `Time up! Ans: ${currentDuel.answer}`
                            : `Ans: ${currentDuel.answer}`}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextDuel}
                        className="text-sm font-bold text-[#FF7A00] hover:underline"
                      >
                        Next Duel →
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-400/15 text-sm">
                <span className="text-[#94A3B8]">Apex Arena Clash</span>
                <Link to="/arena" onClick={() => playNav()} className="font-bold text-[#38BDF8] hover:underline">
                  Play Arena →
                </Link>
              </div>
            </article>

            {/* WIDGET 4: 15-BUBBLE NTA CBT PALETTE */}
            <article className="obsidian-card obsidian-glow-cyan rounded-3xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#00D4FF] uppercase tracking-wider">
                    NTA CBT Palette
                  </span>
                  <span data-testid="palette-counts" className="font-mono text-xs text-[#94A3B8] tabular-nums">
                    {answeredCount} Ans · {markedCount} Rev
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-[#F8FAFC]">15-Bubble Exam Grid</h3>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Tap any bubble to cycle Unanswered → Answered → Marked → Skipped.
                </p>

                <div className="grid grid-cols-5 gap-2 mt-4">
                  {palette.map((status, idx) => {
                    const colorMap: Record<PaletteStatus, string> = {
                      unanswered: 'bg-[#060A14] border-slate-500/35 text-[#94A3B8]',
                      answered: 'bg-emerald-500/25 border-emerald-400 text-emerald-200',
                      marked: 'bg-purple-500/25 border-purple-400 text-purple-200',
                      skipped: 'bg-[#FF7A00]/20 border-[#FF7A00] text-[#FF9E3D]',
                    };
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCyclePalette(idx)}
                        aria-label={`Question ${idx + 1}: ${status}`}
                        className={`h-10 rounded-xl border font-mono text-xs font-bold transition-transform active:scale-95 ${colorMap[status]}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-400/15 text-xs text-[#94A3B8]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Ans
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Marked
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#FF7A00]" /> Skipped
                </span>
                <Link to="/cbt-mocks" onClick={() => playNav()} className="text-sm font-bold text-[#00D4FF] hover:underline">
                  Full CBT →
                </Link>
              </div>
            </article>

            {/* WIDGET 5: 5-STAGE CHAPTER MASTERY TRACKER */}
            <article className="obsidian-card obsidian-glow-blue rounded-3xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#38BDF8] uppercase tracking-wider">
                    5-Stage Mastery
                  </span>
                  <span data-testid="mastery-percent" className="font-mono text-xs font-bold text-[#00D4FF] tabular-nums">
                    {masteryPercent}% Mastered
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-[#F8FAFC]">Electrostatics Tracker</h3>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Toggle each checkpoint to verify true chapter readiness.
                </p>

                <div className="h-2.5 rounded-full bg-[#060A14] border border-slate-400/15 overflow-hidden mt-4">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#00D4FF] to-[#FF7A00] transition-all duration-300"
                    style={{ width: `${masteryPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-5 gap-1.5 mt-4">
                  {MASTERY_STAGES.map((stage) => {
                    const active = masteryDone.includes(stage.id);
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleToggleMastery(stage.id)}
                        className={`py-2.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          active
                            ? 'bg-[#00D4FF]/15 border-[#00D4FF]/60 text-[#F8FAFC]'
                            : 'bg-[#060A14]/75 border-slate-500/25 text-[#94A3B8] hover:border-slate-400/50'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${active ? 'text-[#00D4FF]' : 'text-slate-600'}`} />
                        <span className="text-xs font-bold leading-none">{stage.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-400/15 text-sm">
                <span className="text-[#94A3B8]">Class 11–12 Full Syllabus</span>
                <Link to="/materials" onClick={() => playNav()} className="font-bold text-[#38BDF8] hover:underline">
                  All Chapters →
                </Link>
              </div>
            </article>

            {/* WIDGET 6: DAILY TRIFECTA + LAUNCH PREPS AI TUTOR */}
            <article className="obsidian-card obsidian-glow-orange rounded-3xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#FF7A00] uppercase tracking-wider">
                    Daily Trifecta
                  </span>
                  <span data-testid="trifecta-xp" className="font-mono text-xs font-bold text-[#FF9E3D] tabular-nums">
                    +{trifectaXp} XP
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-[#F8FAFC]">Today&apos;s Non-Negotiables</h3>

                <div className="space-y-2 mt-4">
                  {DAILY_TRIFECTA.map((goal) => {
                    const checked = trifectaDone.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => handleToggleTrifecta(goal.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          checked
                            ? 'bg-[#FF7A00]/15 border-[#FF7A00]/55 text-[#F8FAFC]'
                            : 'bg-[#060A14]/75 border-slate-400/20 text-[#CBD5E1] hover:border-slate-400/40'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 text-sm">
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                              checked
                                ? 'bg-[#FF7A00] border-[#FF7A00] text-[#060A14]'
                                : 'border-slate-500/40 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                          <span className={checked ? 'line-through text-[#94A3B8]' : ''}>{goal.label}</span>
                        </span>
                        <span className="font-mono text-xs font-bold text-[#FF9E3D] shrink-0">+{goal.xp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-400/15">
                <Link
                  to="/preps-ai"
                  onClick={() => playNav()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#F97316] text-[#060A14] font-display text-base font-bold transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Preps AI Tutor</span>
                </Link>
              </div>
            </article>
          </div>
        </ResponsiveContainer>
      </section>

      {/* =====================================================================
          4 FREE SUBJECT TRACKS (Physics, Chemistry, Maths, Biology)
         ===================================================================== */}
      <section className="py-14 lg:py-20 border-t border-slate-400/10">
        <ResponsiveContainer>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#00D4FF] mb-2">
                4 Free Subject Tracks
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8FAFC]">
                Pick your subject. <span className="hand-underscore">Master every chapter.</span>
              </h2>
            </div>
            <Link
              to="/materials"
              onClick={() => playNav()}
              className="inline-flex items-center gap-1.5 font-display text-lg font-bold text-[#FF7A00] hover:text-[#FF9E3D] whitespace-nowrap"
            >
              <span>Browse Full Syllabus</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SUBJECT_TRACKS.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.id}
                  to={track.to}
                  onClick={() => playNav()}
                  className={`group obsidian-card ${track.glowClass} rounded-3xl p-6 flex flex-col justify-between gap-5 transition-transform duration-200 hover:-translate-y-1 hover:border-slate-300/30`}
                >
                  <div>
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 mb-4"
                      style={{
                        backgroundColor: `${track.color}1A`,
                        color: track.color,
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-display text-2xl font-bold text-[#F8FAFC]">{track.title}</h3>
                    <p className="text-base text-[#94A3B8] mt-1.5 leading-snug">{track.subtitle}</p>
                  </div>

                  <div className="pt-3.5 border-t border-slate-400/15 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[#CBD5E1]">{track.chapters}</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0"
                      style={{ color: track.color }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </ResponsiveContainer>
      </section>
    </PageLayout>
  );
}

export default HomePage;
