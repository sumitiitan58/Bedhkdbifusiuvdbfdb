import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpenCheck,
  CheckCircle2,
  FlaskConical,
  Gamepad2,
  Radar,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { AiCustomGamePlayer } from '../components/arena-games/AiCustomGamePlayer';
import {
  FormulaBlitzGame,
  MistakeBossFightGame,
  NcertLineTrapGame,
  PaperScannerTrainerGame,
  ReactionChainDuelGame,
} from '../components/arena-games/ArenaPlayableModes';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import {
  buildSundayBlitzLeaderboard,
  getEloRankBadge,
  getTrifectaProgress,
} from '../utils/arenaProgression';
import { playClick } from '../utils/soundEffects';

type ArenaModeId =
  | 'ai-generator'
  | 'reaction-chain'
  | 'formula-blitz'
  | 'ncert-trap'
  | 'boss-fight'
  | 'paper-scanner';

const ARENA_MODES: Array<{
  id: ArenaModeId;
  label: string;
  tagline: string;
  duration: string;
  icon: typeof Sparkles;
}> = [
  {
    id: 'ai-generator',
    label: 'AI Custom Game',
    tagline: 'Build any chapter game via Gemini JSON',
    duration: '60–120s',
    icon: Sparkles,
  },
  {
    id: 'reaction-chain',
    label: 'Reaction Chain Duel',
    tagline: '4-step Organic & Inorganic synthesis',
    duration: '60s',
    icon: FlaskConical,
  },
  {
    id: 'formula-blitz',
    label: 'Formula Blitz',
    tagline: 'Physics & Maths ms speed + combos',
    duration: '90s',
    icon: Zap,
  },
  {
    id: 'ncert-trap',
    label: 'NCERT Line-Trap',
    tagline: 'Tap the subtly altered NCERT word',
    duration: '20s/line',
    icon: BookOpenCheck,
  },
  {
    id: 'boss-fight',
    label: 'Mistake Boss Fight',
    tagline: 'Spaced-repetition battle vs wrong Qs',
    duration: '120s',
    icon: Swords,
  },
  {
    id: 'paper-scanner',
    label: 'Paper Scanner Trainer',
    tagline: 'Classify 30 Qs: Green / Yellow / Red',
    duration: '3m / 15m',
    icon: Radar,
  },
];

export default function ArenaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { progression } = usePrepskm2();
  const { profile, firebaseUser, cohortId } = useAuth();
  const { allCohorts } = usePlatformData();

  const initialMode = (searchParams.get('mode') as ArenaModeId) || 'formula-blitz';
  const [activeMode, setActiveMode] = useState<ArenaModeId>(
    ARENA_MODES.some((m) => m.id === initialMode) ? initialMode : 'formula-blitz'
  );

  useEffect(() => {
    const param = searchParams.get('mode') as ArenaModeId | null;
    if (param && ARENA_MODES.some((m) => m.id === param)) {
      setActiveMode(param);
    }
  }, [searchParams]);

  const cohortLabel = allCohorts.find((c) => c.id === cohortId)?.shortLabel ?? 'JEE 2027';
  const studentName = profile?.displayName || firebaseUser?.displayName || 'You (Guest)';

  const trifectaProgress = useMemo(
    () => getTrifectaProgress(progression.trifecta),
    [progression.trifecta]
  );

  const leaderboard = useMemo(
    () => buildSundayBlitzLeaderboard(studentName, cohortLabel, progression),
    [studentName, cohortLabel, progression]
  );

  const selectMode = (mode: ArenaModeId) => {
    playClick();
    setActiveMode(mode);
    setSearchParams({ mode }, { replace: true });
  };

  return (
    <PageLayout>
      <SeoHead
        title="Prepskm Arena — AI Study Games, Formula Blitz & Reaction Duel | Prepskm 2.0"
        description="Play 60–180 second JEE & NEET concept study games: AI Custom Game Generator, Reaction Chain Duel, Formula Blitz, NCERT Line-Trap, Mistake Boss Fight & Paper Scanner."
        canonicalPath="/arena"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Top Arena Header & Season Progression Strip */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Prepskm Arena · Gamified Exam Mastery
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5 text-balance">
              AI-Generated &amp; Playable JEE/NEET Study Games
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Fast 60–180 second duels that build formula recall, NCERT accuracy, and Round-1 paper scanning speed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-zinc-300">
            <span>
              Season XP: <strong className="text-indigo-500">{progression.seasonXp}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Shields: <strong className="text-emerald-500">{progression.streakShields}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-zinc-700">·</span>
            <span>
              Daily Trifecta: <strong className="text-amber-500">{trifectaProgress.completedCount}/3</strong>
            </span>
          </div>
        </div>

        {/* 4 Elo-Style Subject Ratings Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Physics Elo', rating: progression.elo.physics },
            { label: 'Chemistry Elo', rating: progression.elo.chemistry },
            { label: 'Maths / Biology Elo', rating: progression.elo.mathsBio },
            { label: 'Speed Arena Elo', rating: progression.elo.speedArena },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2"
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{stat.label}</p>
                <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {stat.rating}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 text-right">
                {getEloRankBadge(stat.rating)}
              </span>
            </div>
          ))}
        </div>

        {/* Mode Selector Tabs (6 Playable Modes) */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {ARENA_MODES.map((m) => {
            const Icon = m.icon;
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMode(m.id)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-white dark:bg-[#111114] border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-zinc-200 hover:border-indigo-500/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-indigo-500'}`} />
                  <span
                    className={`font-mono text-[10px] ${
                      active ? 'text-indigo-100' : 'text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {m.duration}
                  </span>
                </div>
                <p className="text-xs font-bold mt-2 leading-tight">{m.label}</p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug ${
                    active ? 'text-indigo-100' : 'text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  {m.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Game Stage + Side Progression & Weekly Sunday Blitz Leaderboard */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8">
            {activeMode === 'ai-generator' && <AiCustomGamePlayer />}
            {activeMode === 'reaction-chain' && <ReactionChainDuelGame />}
            {activeMode === 'formula-blitz' && <FormulaBlitzGame />}
            {activeMode === 'ncert-trap' && <NcertLineTrapGame />}
            {activeMode === 'boss-fight' && <MistakeBossFightGame />}
            {activeMode === 'paper-scanner' && <PaperScannerTrainerGame />}
          </div>

          <div className="xl:col-span-4 space-y-5">
            {/* Daily Trifecta Checklist */}
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-emerald-500" />
                  Daily Trifecta Streak Shield
                </h2>
                <span className="font-mono text-xs font-bold text-emerald-500 tabular-nums">
                  {trifectaProgress.percent}%
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  {
                    done: progression.trifecta.pyqsOrTestDone,
                    label: `Solve 15 PYQs or 1 Chapter Test (${progression.trifecta.pyqsSolvedToday}/15)`,
                  },
                  {
                    done: progression.trifecta.focusBlockDone,
                    label: `Complete 1 Focus Block 25m+ (${progression.trifecta.focusMinutesToday}m logged)`,
                  },
                  {
                    done: progression.trifecta.arenaOrMistakesDone,
                    label: `Win 1 Arena Game or clear 3 Mistakes (${progression.trifecta.arenaWinsToday} wins)`,
                  },
                ].map((pillar) => (
                  <div
                    key={pillar.label}
                    className="flex items-start gap-2 text-slate-600 dark:text-zinc-300"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        pillar.done ? 'text-emerald-500' : 'text-slate-300 dark:text-zinc-700'
                      }`}
                    />
                    <span className={pillar.done ? 'line-through opacity-75' : ''}>
                      {pillar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Sunday Blitz Leaderboard */}
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0 truncate">
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Sunday Blitz Leaderboard</span>
                </h2>
                <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 whitespace-nowrap shrink-0">
                  Season XP
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {leaderboard.map((row) => (
                  <div
                    key={`${row.rank}-${row.name}`}
                    className={`py-2.5 flex items-center justify-between gap-2 text-xs ${
                      row.isCurrentUser
                        ? 'px-2.5 -mx-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold'
                        : 'text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono w-5 text-slate-400 dark:text-zinc-500 tabular-nums">
                        #{row.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{row.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                          {row.cohort} · {row.city}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className="font-bold">{row.seasonXp} XP</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                        Elo {row.speedElo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </PageLayout>
  );
}
