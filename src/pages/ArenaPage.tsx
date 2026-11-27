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
  | 'formula-blitz'
  | 'reaction-chain'
  | 'boss-fight'
  | 'ncert-trap'
  | 'paper-scanner'
  | 'ai-generator';

const ARENA_MODES: Array<{
  id: ArenaModeId;
  label: string;
  tagline: string;
  duration: string;
  accent: string;
  icon: typeof Sparkles;
}> = [
  {
    id: 'formula-blitz',
    label: 'Formula Blitz',
    tagline: 'KaTeX blueprint + [?] snap + 1–4 keys',
    duration: '90s',
    accent: 'text-[#00B4FF]',
    icon: Zap,
  },
  {
    id: 'reaction-chain',
    label: 'Reaction Chain Duel',
    tagline: 'Node-graph pipeline + SVG flasks',
    duration: '60s',
    accent: 'text-[#10B981]',
    icon: FlaskConical,
  },
  {
    id: 'boss-fight',
    label: 'Mistake Boss Fight',
    tagline: 'Segmented Boss HP + 3 Hearts',
    duration: '120s',
    accent: 'text-[#F43F5E]',
    icon: Swords,
  },
  {
    id: 'ncert-trap',
    label: 'NCERT Line-Trap',
    tagline: 'Tap wrong word + 3D flip reveal',
    duration: '20s/line',
    accent: 'text-[#F27B13]',
    icon: BookOpenCheck,
  },
  {
    id: 'paper-scanner',
    label: 'Paper Scanner',
    tagline: 'Flashcard stack + ← ↓ → triage',
    duration: '15s/card',
    accent: 'text-[#00B4FF]',
    icon: Radar,
  },
  {
    id: 'ai-generator',
    label: 'AI Chapter Game',
    tagline: 'Generate any chapter via Gemini',
    duration: 'Custom',
    accent: 'text-[#F27B13]',
    icon: Sparkles,
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
        title="Prepskm Arena — Arcade Study Games, Formula Blitz & Reaction Duel | Prepskm 2.0"
        description="Play 60–120 second JEE & NEET arcade games: Formula Blitz, Reaction Chain Duel, Mistake Boss Fight, NCERT Line-Trap, Paper Scanner & AI Chapter Game Generator."
        canonicalPath="/arena"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Top Arcade Header & Season Progression Strip */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1D56C6] dark:text-[#00B4FF]">
              PREPSKM ARENA · ARCADE EXAM MASTERY
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0E234E] dark:text-white mt-0.5 text-balance">
              High-Energy JEE &amp; NEET Arcade Games
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              5 tactile arcade stages + AI custom chapter generator engineered for formula speed, organic pipelines, and trap immunity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <span className="px-3 py-1.5 rounded-xl bg-[#00B4FF]/10 border border-[#00B4FF]/25 text-[#1D56C6] dark:text-[#00B4FF] font-bold">
              XP: {progression.seasonXp}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] font-bold">
              <Shield className="w-3.5 h-3.5" />
              Shields: {progression.streakShields}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#F27B13]/10 border border-[#F27B13]/25 text-[#F27B13] font-bold">
              Trifecta: {trifectaProgress.completedCount}/3
            </span>
          </div>
        </div>

        {/* 4 Elo-Style Subject Ratings Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Physics Elo', rating: progression.elo.physics },
            { label: 'Chemistry Elo', rating: progression.elo.chemistry },
            { label: 'Maths / Bio Elo', rating: progression.elo.mathsBio },
            { label: 'Speed Arena Elo', rating: progression.elo.speedArena },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200 dark:border-[#00B4FF]/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center justify-between gap-2"
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="font-mono text-2xl font-extrabold text-[#0E234E] dark:text-white tabular-nums mt-0.5">
                  {stat.rating}
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#1D56C6] dark:text-[#00B4FF] text-right">
                {getEloRankBadge(stat.rating)}
              </span>
            </div>
          ))}
        </div>

        {/* 6 Arcade Stage Switcher Deck */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {ARENA_MODES.map((m) => {
            const Icon = m.icon;
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMode(m.id)}
                className={`text-left p-3.5 rounded-2xl border-2 transition-all ${
                  active
                    ? 'bg-[#0E234E] dark:bg-[#1D56C6] border-[#00B4FF] text-white shadow-[0_0_24px_rgba(0,180,255,0.28)]'
                    : 'bg-white dark:bg-[#0D1324] border-slate-200 dark:border-[#00B4FF]/[0.14] text-slate-800 dark:text-slate-200 hover:border-[#00B4FF]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#00B4FF]' : m.accent}`} />
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      active ? 'text-[#00B4FF]' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {m.duration}
                  </span>
                </div>
                <p className="font-display text-xs font-extrabold mt-2 leading-tight">{m.label}</p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug ${
                    active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {m.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Arcade Stage + Side Trifecta & Leaderboard */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8">
            {activeMode === 'formula-blitz' && <FormulaBlitzGame />}
            {activeMode === 'reaction-chain' && <ReactionChainDuelGame />}
            {activeMode === 'boss-fight' && <MistakeBossFightGame />}
            {activeMode === 'ncert-trap' && <NcertLineTrapGame />}
            {activeMode === 'paper-scanner' && <PaperScannerTrainerGame />}
            {activeMode === 'ai-generator' && <AiCustomGamePlayer />}
          </div>

          <div className="xl:col-span-4 space-y-5">
            {/* Daily Trifecta Checklist */}
            <div className="rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200 dark:border-[#00B4FF]/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#0E234E] dark:text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-[#10B981]" />
                  Daily Trifecta Streak Shield
                </h2>
                <span className="font-mono text-xs font-bold text-[#10B981] tabular-nums">
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
                    className="flex items-start gap-2 text-slate-600 dark:text-slate-300"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        pillar.done ? 'text-[#10B981]' : 'text-slate-300 dark:text-slate-700'
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
            <div className="rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200 dark:border-[#00B4FF]/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-[#0E234E] dark:text-white flex items-center gap-2 min-w-0 truncate">
                  <Trophy className="w-4 h-4 text-[#F27B13] shrink-0" />
                  <span className="truncate">Sunday Blitz Leaderboard</span>
                </h2>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                  Season XP
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {leaderboard.map((row) => (
                  <div
                    key={`${row.rank}-${row.name}`}
                    className={`py-2.5 flex items-center justify-between gap-2 text-xs ${
                      row.isCurrentUser
                        ? 'px-2.5 -mx-2.5 rounded-lg bg-[#00B4FF]/15 text-[#1D56C6] dark:text-[#00B4FF] font-bold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono w-5 text-slate-400 dark:text-slate-500 tabular-nums">
                        #{row.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{row.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {row.cohort} · {row.city}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className="font-bold">{row.seasonXp} XP</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
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
