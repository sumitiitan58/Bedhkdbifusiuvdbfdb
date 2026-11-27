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
import { ApexDuelBattle } from '../components/arena-games/ApexDuelBattle';
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
    id: 'apex-duel',
    label: 'Apex 1v1 vs AI',
    tagline: 'Equal 1000 pts · Live Point Trading',
    duration: '1v1 Live',
    accent: 'text-[#F27B13]',
    icon: Swords,
  },
  {
    id: 'formula-blitz',
    label: 'Quantum Clash',
    tagline: 'KaTeX blueprint + [?] snap + 1–4 keys',
    duration: '90s',
    accent: 'text-[#00B4FF]',
    icon: Zap,
  },
  {
    id: 'reaction-chain',
    label: 'Synthesis Strike',
    tagline: 'Node-graph pipeline + SVG flasks',
    duration: '60s',
    accent: 'text-[#10B981]',
    icon: FlaskConical,
  },
  {
    id: 'paper-scanner',
    label: 'Logic Labyrinth',
    tagline: 'Rapid triage stack + ← ↓ → strategy',
    duration: '15s/card',
    accent: 'text-[#00B4FF]',
    icon: Radar,
  },
  {
    id: 'boss-fight',
    label: 'Titan Overlord',
    tagline: 'Segmented Boss HP + 3 Hearts',
    duration: '120s',
    accent: 'text-[#F43F5E]',
    icon: Shield,
  },
  {
    id: 'ncert-trap',
    label: 'Codex Fracture',
    tagline: 'Expose NCERT trap word + 3D flip',
    duration: '20s/line',
    accent: 'text-[#F27B13]',
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

export default function ArenaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { progression } = usePrepskm2();
  const { profile, firebaseUser, cohortId } = useAuth();
  const { allCohorts } = usePlatformData();

  const initialMode = (searchParams.get('mode') as ArenaModeId) || 'apex-duel';
  const [activeMode, setActiveMode] = useState<ArenaModeId>(
    APEX_ARENA_MODES.some((m) => m.id === initialMode) ? initialMode : 'apex-duel'
  );

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
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1D56C6] dark:text-[#00B4FF]">
              APEX ARENA · COMPETITIVE JEE &amp; NEET BATTLEGROUND
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0E234E] dark:text-white mt-0.5 text-balance">
              Apex Arena — 1v1 AI Point-Trading &amp; Speed Trials
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Battle AI rivals starting at equal 1,000 points or master Quantum Clash, Synthesis Strike, and Logic Labyrinth for live Elo rank climbs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <span className="px-3 py-1.5 rounded-xl bg-[#00B4FF]/15 border border-[#00B4FF]/35 text-[#1D56C6] dark:text-[#00B4FF] font-bold backdrop-blur-md">
              XP: {progression.seasonXp}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/35 text-emerald-700 dark:text-[#10B981] font-bold backdrop-blur-md">
              <Shield className="w-3.5 h-3.5" />
              Shields: {progression.streakShields}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#F27B13]/15 border border-[#F27B13]/35 text-[#F27B13] font-bold backdrop-blur-md">
              Trifecta: {trifectaProgress.completedCount}/3
            </span>
          </div>
        </div>

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
              className="preps-glass-panel p-4 rounded-2xl flex items-center justify-between gap-2"
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

        {/* 7 Competitive Apex Arena Stage Switcher Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {APEX_ARENA_MODES.map((m) => {
            const Icon = m.icon;
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMode(m.id)}
                className={`text-left p-3.5 rounded-2xl border-2 transition-all backdrop-blur-xl ${
                  active
                    ? 'bg-gradient-to-br from-[#0E234E] to-[#1D56C6] border-[#00B4FF] text-white shadow-[0_0_24px_rgba(0,180,255,0.3)]'
                    : 'bg-white/75 dark:bg-[#0D1324]/70 border-white/70 dark:border-[#00B4FF]/20 text-slate-800 dark:text-slate-200 hover:border-[#00B4FF]/65'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#00B4FF]' : m.accent}`} />
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      active ? 'text-amber-300' : 'text-slate-500 dark:text-slate-400'
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

        {/* Active Competitive Stage + Side Trifecta & Apex Season Ladder */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8">
            {activeMode === 'apex-duel' && <ApexDuelBattle />}
            {activeMode === 'formula-blitz' && <FormulaBlitzGame />}
            {activeMode === 'reaction-chain' && <ReactionChainDuelGame />}
            {activeMode === 'paper-scanner' && <PaperScannerTrainerGame />}
            {activeMode === 'boss-fight' && <MistakeBossFightGame />}
            {activeMode === 'ncert-trap' && <NcertLineTrapGame />}
            {activeMode === 'ai-generator' && <AiCustomGamePlayer />}
          </div>

          <div className="xl:col-span-4 space-y-5">
            {/* Daily Trifecta Checklist */}
            <div className="preps-glass-panel rounded-2xl p-5 space-y-3">
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
                    label: `Win 1 Apex Battle or clear 3 Mistakes (${progression.trifecta.arenaWinsToday} wins)`,
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

            {/* Live Apex Arena Season Ladder */}
            <div className="preps-glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-[#0E234E] dark:text-white flex items-center gap-2 min-w-0 truncate">
                  <Trophy className="w-4 h-4 text-[#F27B13] shrink-0" />
                  <span className="truncate">Apex Season Ladder</span>
                </h2>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  Live Rank
                </span>
              </div>

              <div className="divide-y divide-slate-200/70 dark:divide-white/[0.07]">
                {leaderboard.map((row) => (
                  <div
                    key={`${row.rank}-${row.name}`}
                    className={`py-2.5 flex items-center justify-between gap-2 text-xs ${
                      row.isCurrentUser
                        ? 'px-2.5 -mx-2.5 rounded-lg bg-[#00B4FF]/20 text-[#1D56C6] dark:text-[#00B4FF] font-bold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono w-5 text-slate-500 dark:text-slate-400 tabular-nums">
                        #{row.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{row.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {row.cohort} · {row.city}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className="font-bold">{row.seasonXp} XP</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
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
