import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpenCheck,
  CheckCircle2,
  Crosshair,
  FlaskConical,
  Gamepad2,
  Radar,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { AiCustomGamePlayer } from '../components/arena-games/AiCustomGamePlayer';
import { ApexDuelBattle } from '../components/arena-games/ApexDuelBattle';
import { TacticalShooterGame } from '../components/arena-games/TacticalShooterGame';
import { BubbleShooterGame } from '../components/arena-games/BubbleShooterGame';
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
import { SundayBlitzCard } from '../components/dashboard/SundayBlitzCard';
import { DailyTrifectaBar } from '../components/dashboard/DailyTrifectaBar';
import { FOCUS_LEADERBOARD_TOP5 } from '../data/prepskm2UpgradeData';
import { playClick } from '../utils/soundEffects';

type ArenaModeId =
  | 'tactical-shooter'
  | 'bubble-shooter'
  | 'apex-duel'
  | 'formula-blitz'
  | 'reaction-chain'
  | 'paper-scanner'
  | 'boss-fight'
  | 'ncert-trap'
  | 'ai-generator';

const APEX_ARENA_MODES: Array<{
  id: ArenaModeId;
  label: string;
  tagline: string;
  duration: string;
  accent: string;
  icon: typeof Sparkles;
}> = [
  {
    id: 'tactical-shooter',
    label: 'Tactical Shooter',
    tagline: 'Reload & Revive via syllabus MCQs',
    duration: 'Lvl 1–3',
    accent: 'text-[#22D3EE]',
    icon: Crosshair,
  },
  {
    id: 'bubble-shooter',
    label: 'Bubble Shooter',
    tagline: 'Hex cluster pops + Plasma Bomb quiz',
    duration: 'Lvl 1–3',
    accent: 'text-purple-400',
    icon: Target,
  },
  {
    id: 'apex-duel',
    label: 'Apex 1v1 vs AI',
    tagline: 'Equal 1000 pts · Live Point Trading',
    duration: '1v1 Live',
    accent: 'text-[#F97316]',
    icon: Swords,
  },
  {
    id: 'formula-blitz',
    label: 'Quantum Clash',
    tagline: 'KaTeX blueprint + [?] snap + 1–4 keys',
    duration: '90s',
    accent: 'text-[#06B6D4]',
    icon: Zap,
  },
  {
    id: 'reaction-chain',
    label: 'Synthesis Strike',
    tagline: 'Node-graph pipeline + SVG flasks',
    duration: '60s',
    accent: 'text-[#22C55E]',
    icon: FlaskConical,
  },
  {
    id: 'paper-scanner',
    label: 'Logic Labyrinth',
    tagline: 'Rapid triage stack + ← ↓ → strategy',
    duration: '15s/card',
    accent: 'text-[#06B6D4]',
    icon: Radar,
  },
  {
    id: 'boss-fight',
    label: 'Titan Overlord',
    tagline: 'Segmented Boss HP + 3 Hearts',
    duration: '120s',
    accent: 'text-[#EF4444]',
    icon: Shield,
  },
  {
    id: 'ncert-trap',
    label: 'Codex Fracture',
    tagline: 'Expose NCERT trap word + 3D flip',
    duration: '20s/line',
    accent: 'text-[#F97316]',
    icon: BookOpenCheck,
  },
  {
    id: 'ai-generator',
    label: 'Neural Forge',
    tagline: 'Generate custom chapter arena',
    duration: 'Custom',
    accent: 'text-purple-400',
    icon: Sparkles,
  },
];

type LeaderboardMetricTab = 'focus' | 'elo' | 'xp';
type LeaderboardPeriod = 'today' | 'week' | 'season';

export default function ArenaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { progression } = usePrepskm2();
  const { profile, firebaseUser, cohortId } = useAuth();
  const { allCohorts } = usePlatformData();

  const initialMode = (searchParams.get('mode') as ArenaModeId) || 'tactical-shooter';
  const [activeMode, setActiveMode] = useState<ArenaModeId>(
    APEX_ARENA_MODES.some((m) => m.id === initialMode) ? initialMode : 'tactical-shooter'
  );
  const [lbMetric, setLbMetric] = useState<LeaderboardMetricTab>('elo');
  const [lbPeriod, setLbPeriod] = useState<LeaderboardPeriod>('week');

  useEffect(() => {
    const param = searchParams.get('mode') as ArenaModeId | null;
    if (param && APEX_ARENA_MODES.some((m) => m.id === param)) {
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

  const periodFactor = lbPeriod === 'today' ? 1 : lbPeriod === 'week' ? 6.2 : 24;

  const globalLeaderboardRows = useMemo(() => {
    if (lbMetric === 'focus') {
      return FOCUS_LEADERBOARD_TOP5.map((row) => ({
        rank: row.rank,
        name: row.name,
        subtitle: row.exam,
        primaryVal: `${(row.hoursToday * periodFactor).toFixed(1)}h`,
        secondaryVal: `${row.delta === '0' ? 'Steady' : `${row.delta} rank`}`,
        isCurrentUser: false,
      }));
    }
    return leaderboard.map((row) => ({
      rank: row.rank,
      name: row.name,
      subtitle: `${row.cohort} · ${row.city}`,
      primaryVal:
        lbMetric === 'elo'
          ? `${row.speedElo} ELO`
          : `${Math.round(row.seasonXp * (lbPeriod === 'today' ? 0.14 : lbPeriod === 'week' ? 0.45 : 1))} XP`,
      secondaryVal: lbMetric === 'elo' ? `${row.seasonXp} XP` : `Elo ${row.speedElo}`,
      isCurrentUser: row.isCurrentUser,
    }));
  }, [lbMetric, lbPeriod, leaderboard, periodFactor]);

  const selectMode = (mode: ArenaModeId) => {
    playClick();
    setActiveMode(mode);
    setSearchParams({ mode }, { replace: true });
  };

  return (
    <PageLayout>
      <SeoHead
        title="Apex Arena — Quantum Clash, Synthesis Strike, Logic Labyrinth & 1v1 AI Duels | Prepskm"
        description="Compete in Apex Arena: 2-player point-trading battles against AI rivals, Quantum Clash, Synthesis Strike, Logic Labyrinth, Titan Overlord, Codex Fracture, and Neural Forge."
        canonicalPath="/arena"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Top Apex Arena Header & Season Progression Strip */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#0284C7] dark:text-[#06B6D4]">
              APEX ARENA · COMPETITIVE JEE &amp; NEET BATTLEGROUND
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1F3A] dark:text-[#F8FAFC] mt-0.5 text-balance">
              Apex Arena — Tactical Shooter, Bubble Shooter &amp; Speed Trials
            </h1>
            <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-1">
              Play Level 1–3 study-powered Tactical Shooter (Reload &amp; Revive via syllabus MCQs), Bubble Shooter, 1v1 AI duels, and rapid JEE/NEET drills.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <span className="px-3 py-1.5 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/35 text-[#0284C7] dark:text-[#22D3EE] font-bold">
              XP: {progression.seasonXp}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/35 text-[#15803D] dark:text-[#22C55E] font-bold">
              <Shield className="w-3.5 h-3.5" />
              Shields: {progression.streakShields}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#F97316]/15 border border-[#F97316]/35 text-[#EA580C] dark:text-[#F97316] font-bold">
              Trifecta: {trifectaProgress.completedCount}/3
            </span>
          </div>
        </div>

        {/* Daily Trifecta Habit Loop Bar */}
        <DailyTrifectaBar />

        {/* 4 Elo-Style Subject Ratings Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Quantum Clash Elo', rating: progression.elo.physics },
            { label: 'Synthesis Strike Elo', rating: progression.elo.chemistry },
            { label: 'Logic Labyrinth Elo', rating: progression.elo.mathsBio },
            { label: 'Apex 1v1 Ladder Elo', rating: progression.elo.speedArena },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-4 flex items-center justify-between gap-2"
            >
              <div>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">{stat.label}</p>
                <p className="font-mono text-2xl font-extrabold text-[#0B1F3A] dark:text-[#F8FAFC] tabular-nums mt-0.5">
                  {stat.rating}
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#0284C7] dark:text-[#22D3EE] text-right">
                {getEloRankBadge(stat.rating)}
              </span>
            </div>
          ))}
        </div>

        {/* Competitive Apex Arena Stage Switcher Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {APEX_ARENA_MODES.map((m) => {
            const Icon = m.icon;
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMode(m.id)}
                className={`text-left p-3 rounded-2xl border-2 transition-all ${
                  active
                    ? 'bg-[#0B1F3A] dark:bg-[#162033] border-[#06B6D4] text-white'
                    : 'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC] hover:border-[#06B6D4]/65'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#22D3EE]' : m.accent}`} />
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      active ? 'text-[#FB923C]' : 'text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {m.duration}
                  </span>
                </div>
                <p className="font-display text-xs font-extrabold mt-2 leading-tight">{m.label}</p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug ${
                    active ? 'text-slate-300' : 'text-[#475569] dark:text-[#94A3B8]'
                  }`}
                >
                  {m.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Competitive Stage + Global Rating & Leaderboards */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8">
            {activeMode === 'tactical-shooter' && <TacticalShooterGame />}
            {activeMode === 'bubble-shooter' && <BubbleShooterGame />}
            {activeMode === 'apex-duel' && <ApexDuelBattle />}
            {activeMode === 'formula-blitz' && <FormulaBlitzGame />}
            {activeMode === 'reaction-chain' && <ReactionChainDuelGame />}
            {activeMode === 'paper-scanner' && <PaperScannerTrainerGame />}
            {activeMode === 'boss-fight' && <MistakeBossFightGame />}
            {activeMode === 'ncert-trap' && <NcertLineTrapGame />}
            {activeMode === 'ai-generator' && <AiCustomGamePlayer />}
          </div>

          <div className="xl:col-span-4 space-y-5">
            {/* Global Rating & Leaderboards Card (Focus Hours | Apex Arena ELO | Season XP) */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] flex items-center gap-2 min-w-0 truncate">
                  <Trophy className="w-4 h-4 text-[#F97316] shrink-0" />
                  <span className="truncate">Global Leaderboards</span>
                </h2>
                <div className="inline-flex items-center gap-1 text-[10px] font-mono">
                  {(
                    [
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: 'Week' },
                      { id: 'season', label: 'Season' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setLbPeriod(p.id);
                      }}
                      className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                        lbPeriod === p.id
                          ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                          : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 Leaderboard Metric Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#EEF4FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08]">
                {(
                  [
                    { id: 'focus', label: 'Focus Hours' },
                    { id: 'elo', label: 'Arena ELO' },
                    { id: 'xp', label: 'Season XP' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setLbMetric(tab.id);
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      lbMetric === tab.id
                        ? 'bg-[#FFFFFF] dark:bg-[#0F172A] text-[#0284C7] dark:text-[#22D3EE] shadow-sm'
                        : 'text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-[#E2E8F0] dark:divide-white/[0.08]">
                {globalLeaderboardRows.map((row) => (
                  <div
                    key={`${lbMetric}-${row.rank}-${row.name}`}
                    className={`py-2.5 flex items-center justify-between gap-2 text-xs ${
                      row.isCurrentUser
                        ? 'px-2.5 -mx-2.5 rounded-lg bg-[#06B6D4]/15 text-[#0284C7] dark:text-[#22D3EE] font-bold'
                        : 'text-[#0B1F3A] dark:text-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono w-5 text-[#475569] dark:text-[#94A3B8] tabular-nums">
                        #{row.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{row.name}</p>
                        <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] truncate">
                          {row.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className="font-bold">{row.primaryVal}</p>
                      <p className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                        {row.secondaryVal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact Trifecta Status Summary */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-[#22C55E]" />
                  Arena Streak Checklist
                </h2>
                <span className="font-mono text-xs font-bold text-[#15803D] dark:text-[#22C55E] tabular-nums">
                  {trifectaProgress.percent}%
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  {
                    done: progression.trifecta.pyqsOrTestDone,
                    label: `Solve 10 Concept PYQs (${progression.trifecta.pyqsSolvedToday}/10)`,
                  },
                  {
                    done: progression.trifecta.focusBlockDone,
                    label: `Complete 1 Focus Block 25m+ (${progression.trifecta.focusMinutesToday}m logged)`,
                  },
                  {
                    done: progression.trifecta.arenaOrMistakesDone,
                    label: `Win 1 Apex Battle (${progression.trifecta.arenaWinsToday} wins)`,
                  },
                ].map((pillar) => (
                  <div
                    key={pillar.label}
                    className="flex items-start gap-2 text-[#475569] dark:text-[#94A3B8]"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        pillar.done ? 'text-[#22C55E]' : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                    <span className={pillar.done ? 'line-through opacity-75' : ''}>
                      {pillar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sunday All-India Blitz Banner */}
        <SundayBlitzCard />
      </ResponsiveContainer>
    </PageLayout>
  );
}
