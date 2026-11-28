import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Castle,
  Coins,
  Compass,
  Crosshair,
  Crown,
  Flame,
  FlaskConical,
  Gauge,
  Layers,
  Play,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import {
  BLUEPRINT_SYNC_EVENT,
  loadApexProfileStats,
  type ApexProfileSyncState,
} from '../services/blueprintStore';
import { PageLayout } from '../layouts/PageLayout';
import { SeoHead } from '../components/SeoHead';
import { EmpireBuilderGame } from '../components/arena-games/EmpireBuilderGame';
import { ChemistryEscapeRoomGame } from '../components/arena-games/ChemistryEscapeRoomGame';
import { FormulaRunnerGame } from '../components/arena-games/FormulaRunnerGame';
import { ConceptTowerDefenseGame } from '../components/arena-games/ConceptTowerDefenseGame';
import { FormulaClashGame } from '../components/arena-games/FormulaClashGame';
import { ConceptLinkGame } from '../components/arena-games/ConceptLinkGame';
import { KaunBanegaTopperGame } from '../components/arena-games/KaunBanegaTopperGame';
import { SyllabusDominionGame } from '../components/arena-games/SyllabusDominionGame';

type ArenaGameId =
  | 'empire-builder'
  | 'chemistry-escape'
  | 'formula-runner'
  | 'tower-defense'
  | 'formula-clash'
  | 'concept-link'
  | 'kaun-banega-topper'
  | 'syllabus-dominion';

interface ShowcaseGameMeta {
  id: ArenaGameId;
  title: string;
  subtitle: string;
  difficulty: string;
  rewardBadge: string;
  description: string;
  accentGradient: string;
  borderHover: string;
  icon: typeof Swords;
  flagship?: boolean;
}

const SHOWCASE_GAMES: ShowcaseGameMeta[] = [
  {
    id: 'empire-builder',
    title: '3D Empire Builder',
    subtitle: 'Open-World Voxel Realm & Palda War',
    difficulty: 'Flagship · 3D WebGL',
    rewardBadge: 'Empire Coins · 10 → 3,000 sq. ft.',
    description:
      'Pick 1 of 5 PrepSKM Robot Avatars, explore your enterable Rajmahal & Gaon village, watch Live Study TV, drive Gaadi & Ghoda Gaadi, and win Palda Tug-of-War Quiz Battles.',
    accentGradient: 'obsidian-glow-lime',
    borderHover: 'hover:border-[#C6FF00]/60',
    icon: Castle,
    flagship: true,
  },
  {
    id: 'chemistry-escape',
    title: 'Chemistry Lab Escape Room',
    subtitle: 'Cyber-Lab Sector 7 & Khandahar Editions',
    difficulty: 'Flagship · Dual Edition',
    rewardBadge: 'Rank S/A/B · 5 Lab Stations & C4 Rescue',
    description:
      'Escape Cyber-Lab Sector 7 (5 interactive JEE Chemistry stations + O₂ timer) or brave voice-guided Khandahar nested ruined doors to disarm the 4-digit C4 lock!',
    accentGradient: 'obsidian-glow-blue',
    borderHover: 'hover:border-cyan-400/60',
    icon: FlaskConical,
    flagship: true,
  },
  {
    id: 'formula-runner',
    title: 'Formula Runner',
    subtitle: 'High-Speed Neon Formula Racer',
    difficulty: 'Arcade · Reflex',
    rewardBadge: 'Nitro Combos · Speed Elo',
    description:
      'Swerve across a 3-lane synth highway into the correct Physics, Chemistry, or Mathematics formula gate to trigger Nitro Boost and combo multipliers.',
    accentGradient: 'obsidian-glow-amber',
    borderHover: 'hover:border-amber-400/55',
    icon: Gauge,
    flagship: true,
  },
  {
    id: 'tower-defense',
    title: 'Concept Tower Defense',
    subtitle: 'Defend the Knowledge Core',
    difficulty: 'Strategy · Waves',
    rewardBadge: '3 Subject Turrets · Boss Waves',
    description:
      'Construct and upgrade Optics Lasers, Organic Acid Cannons, and Calculus Pulse Towers by solving subject questions against waves of exam-trap enemies.',
    accentGradient: 'obsidian-glow-purple',
    borderHover: 'hover:border-purple-400/55',
    icon: Crosshair,
    flagship: true,
  },
  {
    id: 'formula-clash',
    title: 'Formula Clash',
    subtitle: 'Tactical Card Battle',
    difficulty: 'Tactical · Medium',
    rewardBadge: '+150 Arena XP · +15 Elo',
    description:
      'Play Physics, Chemistry, Maths & Biology Play Cards with Energy. Prove the formula within 5s to unleash a 1.5× Critical Hit beam!',
    accentGradient: 'obsidian-glow-blue',
    borderHover: 'hover:border-sky-400/55',
    icon: Swords,
  },
  {
    id: 'concept-link',
    title: 'Concept Link',
    subtitle: 'Fast Chain Reaction Cards',
    difficulty: 'Speed · Rapid',
    rewardBadge: '+120 XP · +1 Streak Shield',
    description:
      'Uno-inspired syllabus rush! Chain matching Subject Colors, Chapter Tags, Wild NCERT cards, and +2 Doubt Traps to empty your 7-card hand first.',
    accentGradient: 'obsidian-glow-purple',
    borderHover: 'hover:border-purple-400/55',
    icon: Layers,
  },
  {
    id: 'kaun-banega-topper',
    title: 'Kaun Banega Topper',
    subtitle: '15-Step Hot-Seat Ladder',
    difficulty: 'Ladder · Progressive',
    rewardBadge: 'Up to 50,000 XP · Topper Crown',
    description:
      'Climb 15 escalating steps with Q5 & Q10 Safe Havens, 50:50, Peer Poll, Flip Question, and Ask Buddy voice lifeline.',
    accentGradient: 'obsidian-glow-amber',
    borderHover: 'hover:border-amber-400/55',
    icon: Crown,
  },
  {
    id: 'syllabus-dominion',
    title: 'Syllabus Dominion',
    subtitle: 'Hex Territory Conquest',
    difficulty: 'Strategy · Campaign',
    rewardBadge: '+15% Region XP Bonus',
    description:
      'Conquer a glowing hexagonal war map across Mechanics, Electrodynamics, Organic, Calculus & Physiology via 3-question Skirmishes and Boss PYQ Towers.',
    accentGradient: 'obsidian-glow-emerald',
    borderHover: 'hover:border-emerald-400/55',
    icon: Compass,
  },
];

function GameArtBanner({ id }: { id: ArenaGameId }) {
  if (id === 'empire-builder') {
    return (
      <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
        <rect x="0" y="78" width="360" height="32" fill="#14532d" fillOpacity="0.45" />
        <rect x="128" y="34" width="104" height="52" rx="6" fill="#d97706" fillOpacity="0.28" stroke="#fbbf24" strokeWidth="1.8" />
        <path d="M 155 34 Q 180 4 205 34 Z" fill="#fbbf24" fillOpacity="0.4" stroke="#fbbf24" strokeWidth="1.6" />
        <text x="180" y="64" textAnchor="middle" fill="#fef3c7" fontSize="10" fontWeight="900">RAJMAHAL 3D</text>
        <rect x="34" y="54" width="52" height="32" rx="6" fill="#0ea5e9" fillOpacity="0.22" stroke="#38bdf8" strokeWidth="1.4" />
        <text x="60" y="74" textAnchor="middle" fill="#bae6fd" fontSize="8.5" fontWeight="800">GAON TV</text>
        <rect x="274" y="50" width="56" height="36" rx="6" fill="#C6FF00" fillOpacity="0.16" stroke="#C6FF00" strokeWidth="1.5" />
        <text x="302" y="72" textAnchor="middle" fill="#C6FF00" fontSize="8.5" fontWeight="900">PALDA WAR</text>
      </svg>
    );
  }
  if (id === 'chemistry-escape') {
    return (
      <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
        <rect x="24" y="20" width="140" height="72" rx="12" fill="rgba(6,182,212,0.14)" stroke="#22d3ee" strokeWidth="1.6" />
        <text x="94" y="50" textAnchor="middle" fill="#cffafe" fontSize="10.5" fontWeight="900">CYBER-LAB 7</text>
        <text x="94" y="68" textAnchor="middle" fill="#22d3ee" fontSize="8.5" fontWeight="700">10:00 · 5 STATIONS</text>
        <rect x="196" y="20" width="140" height="72" rx="12" fill="rgba(245,158,11,0.14)" stroke="#f59e0b" strokeWidth="1.6" />
        <text x="266" y="50" textAnchor="middle" fill="#fef3c7" fontSize="10.5" fontWeight="900">KHANDAHAR</text>
        <text x="266" y="68" textAnchor="middle" fill="#f87171" fontSize="8.5" fontWeight="800">C4 LOCK · TTS VOICE</text>
      </svg>
    );
  }
  if (id === 'formula-runner') {
    return (
      <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
        <polygon points="130,18 230,18 320,104 40,104" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.6" />
        <line x1="163" y1="18" x2="133" y2="104" stroke="#C6FF00" strokeDasharray="5 5" />
        <line x1="197" y1="18" x2="227" y2="104" stroke="#C6FF00" strokeDasharray="5 5" />
        <rect x="148" y="64" width="64" height="24" rx="6" fill="#2563eb" stroke="#C6FF00" strokeWidth="1.8" />
        <text x="180" y="79" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="900">√(2gR)</text>
      </svg>
    );
  }
  if (id === 'tower-defense') {
    return (
      <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
        <path d="M 24 32 L 130 32 L 130 82 L 250 82 L 250 48 L 320 48" fill="none" stroke="#334155" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="90" cy="70" r="14" fill="#38bdf8" fillOpacity="0.28" stroke="#38bdf8" strokeWidth="1.8" />
        <circle cx="195" cy="40" r="14" fill="#34d399" fillOpacity="0.28" stroke="#34d399" strokeWidth="1.8" />
        <circle cx="322" cy="48" r="18" fill="#C6FF00" fillOpacity="0.2" stroke="#C6FF00" strokeWidth="2" />
        <text x="322" y="51" textAnchor="middle" fill="#C6FF00" fontSize="8" fontWeight="900">CORE</text>
      </svg>
    );
  }
  if (id === 'formula-clash') {
    return (
      <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
        <rect x="24" y="18" width="76" height="76" rx="12" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="1.6" />
        <text x="62" y="52" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontWeight="800">F = ma</text>
        <text x="62" y="70" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="700">25 DMG</text>
        <circle cx="180" cy="52" r="17" fill="#06070A" stroke="#C6FF00" strokeWidth="1.8" />
        <text x="180" y="56" textAnchor="middle" fill="#C6FF00" fontSize="9.5" fontWeight="900">1.5×</text>
        <rect x="260" y="18" width="76" height="76" rx="12" fill="rgba(192,132,252,0.12)" stroke="#c084fc" strokeWidth="1.6" />
        <text x="298" y="52" textAnchor="middle" fill="#f3e8ff" fontSize="11" fontWeight="800">Φ = q/ε₀</text>
        <text x="298" y="70" textAnchor="middle" fill="#c084fc" fontSize="9" fontWeight="700">+22 SHD</text>
      </svg>
    );
  }
  if (id === 'concept-link') {
    return (
      <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
        <rect x="52" y="24" width="66" height="68" rx="10" transform="rotate(-10 85 58)" fill="rgba(56,189,248,0.14)" stroke="#38bdf8" strokeWidth="1.5" />
        <rect x="144" y="16" width="74" height="76" rx="12" fill="rgba(192,132,252,0.18)" stroke="#c084fc" strokeWidth="2" />
        <text x="181" y="52" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900">WILD</text>
        <text x="181" y="68" textAnchor="middle" fill="#C6FF00" fontSize="9" fontWeight="700">NCERT</text>
        <rect x="242" y="24" width="66" height="68" rx="10" transform="rotate(10 275 58)" fill="rgba(52,211,153,0.14)" stroke="#34d399" strokeWidth="1.5" />
        <text x="275" y="60" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="800">+2 TRAP</text>
      </svg>
    );
  }
  if (id === 'kaun-banega-topper') {
    return (
      <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
        <circle cx="180" cy="56" r="44" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="180" cy="56" r="34" fill="#06070A" stroke="#C6FF00" strokeWidth="1.6" />
        <text x="180" y="53" textAnchor="middle" fill="#C6FF00" fontSize="12" fontWeight="900">50,000</text>
        <text x="180" y="66" textAnchor="middle" fill="#e2e8f0" fontSize="7.5" fontWeight="700">15-STEP CROWN</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 360 110" className="w-full h-28" aria-hidden="true">
      {[
        { cx: 108, cy: 55, fill: 'rgba(56,189,248,0.22)', stroke: '#38bdf8', label: 'MECH' },
        { cx: 180, cy: 38, fill: 'rgba(198,255,0,0.18)', stroke: '#C6FF00', label: 'EM' },
        { cx: 180, cy: 78, fill: 'rgba(192,132,252,0.18)', stroke: '#c084fc', label: 'ORG' },
        { cx: 252, cy: 55, fill: 'rgba(52,211,153,0.18)', stroke: '#34d399', label: 'BIO' },
      ].map((h) => (
        <g key={h.label}>
          <polygon
            points={`${h.cx - 24},${h.cy} ${h.cx - 12},${h.cy - 20} ${h.cx + 12},${h.cy - 20} ${h.cx + 24},${h.cy} ${h.cx + 12},${h.cy + 20} ${h.cx - 12},${h.cy + 20}`}
            fill={h.fill}
            stroke={h.stroke}
            strokeWidth="1.6"
          />
          <text x={h.cx} y={h.cy + 3} textAnchor="middle" fill="#fff" fontSize="8.5" fontWeight="800">
            {h.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ArenaPage() {
  const { firebaseUser } = useAuth();
  const { progression, levelProgress } = usePrepskm2();
  const userScope = firebaseUser?.uid ?? 'guest';

  const [activeGame, setActiveGame] = useState<ArenaGameId | null>(null);
  const [apexStats, setApexStats] = useState<ApexProfileSyncState>(() =>
    loadApexProfileStats(userScope)
  );

  useEffect(() => {
    const sync = () => setApexStats(loadApexProfileStats(userScope));
    sync();
    window.addEventListener(BLUEPRINT_SYNC_EVENT, sync);
    return () => window.removeEventListener(BLUEPRINT_SYNC_EVENT, sync);
  }, [userScope]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeGame]);

  const trifectaCompletedCount =
    (progression.trifecta.pyqsOrTestDone ? 1 : 0) +
    (progression.trifecta.focusBlockDone ? 1 : 0) +
    (progression.trifecta.arenaOrMistakesDone ? 1 : 0);

  return (
    <PageLayout hideFooter={Boolean(activeGame)} hideMobileNav={Boolean(activeGame)}>
      <SeoHead
        title="Apex Arena — 3D Empire Builder, Chemistry Lab Escape Room & Study Games | prepskm.in"
        description="Play 3D Open-World Empire Builder, Chemistry Lab Escape Room (Cyber-Lab & Khandahar), Formula Runner, Concept Tower Defense, and more in PrepsKM Apex Arena."
        canonicalPath="/arena"
      />
      <div className="min-h-screen bg-[#06070A] text-slate-100 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Apex Arena Unified Progression Header (only in Lobby; hidden during full-stage gameplay) */}
          {!activeGame && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl obsidian-card obsidian-glow-lime px-5 py-4 mb-7">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#C6FF00]/15 border border-[#C6FF00]/40 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-[#C6FF00]" />
                </div>
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    <span className="hand-underscore">Apex Arena</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    3D Empire Builder · Chemistry Lab Escape Room · Formula Runner · Concept Tower Defense
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/12 border border-amber-400/30 text-amber-300 font-mono tabular-nums">
                  <Castle className="w-3.5 h-3.5" />
                  {apexStats.empireAreaSqFt.toLocaleString('en-IN')} sq. ft.
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C6FF00]/12 border border-[#C6FF00]/35 text-[#C6FF00] font-mono tabular-nums">
                  <Coins className="w-3.5 h-3.5" />
                  {apexStats.empireCoins} Coins
                </span>
                {apexStats.bestCyberLabRank && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/12 border border-cyan-400/35 text-cyan-300 font-mono tabular-nums">
                    <FlaskConical className="w-3.5 h-3.5" />
                    Lab Rank {apexStats.bestCyberLabRank}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-mono tabular-nums">
                  <Zap className="w-3.5 h-3.5 text-[#C6FF00]" />
                  Lv.{levelProgress.level} · {progression.seasonXp.toLocaleString('en-IN')} XP
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-mono tabular-nums">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Trifecta {trifectaCompletedCount}/3
                </span>
              </div>
            </div>
          )}

          {/* Active Game Stage OR Lobby Showcase */}
          {activeGame === 'empire-builder' ? (
            <EmpireBuilderGame onBack={() => setActiveGame(null)} />
          ) : activeGame === 'chemistry-escape' ? (
            <ChemistryEscapeRoomGame onBack={() => setActiveGame(null)} />
          ) : activeGame === 'formula-runner' ? (
            <FormulaRunnerGame onBack={() => setActiveGame(null)} />
          ) : activeGame === 'tower-defense' ? (
            <ConceptTowerDefenseGame onBack={() => setActiveGame(null)} />
          ) : activeGame === 'formula-clash' ? (
            <FormulaClashGame onBack={() => setActiveGame(null)} />
          ) : activeGame === 'concept-link' ? (
            <ConceptLinkGame onBack={() => setActiveGame(null)} />
          ) : activeGame === 'kaun-banega-topper' ? (
            <KaunBanegaTopperGame onBack={() => setActiveGame(null)} />
          ) : activeGame === 'syllabus-dominion' ? (
            <SyllabusDominionGame onBack={() => setActiveGame(null)} />
          ) : (
            <div data-testid="arena-showcase-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SHOWCASE_GAMES.map((game, idx) => {
                const Icon = game.icon;
                return (
                  <motion.article
                    key={game.id}
                    data-testid={`arena-card-${game.id}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ y: -4 }}
                    className={`group rounded-3xl obsidian-card ${game.accentGradient} ${game.borderHover} overflow-hidden flex flex-col justify-between transition-all shadow-xl`}
                  >
                    <div className="border-b border-white/[0.08] px-5 pt-4 pb-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#06070A]/75 border border-white/10 text-[11px] font-bold text-slate-200">
                          <Icon className="w-3.5 h-3.5 text-[#C6FF00]" />
                          {game.difficulty}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                          <Sparkles className="w-3 h-3" />
                          {game.rewardBadge}
                        </span>
                      </div>
                      <GameArtBanner id={game.id} />
                    </div>

                    <div className="p-6 flex flex-col flex-1 justify-between gap-5">
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#C6FF00]">
                          {game.subtitle}
                        </p>
                        <h2 className="font-display text-2xl font-bold text-white mt-1">
                          {game.title}
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed mt-2">
                          {game.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        data-testid={`play-btn-${game.id}`}
                        onClick={() => setActiveGame(game.id)}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#C6FF00] hover:bg-[#d6ff47] text-[#06070A] font-black text-sm shadow-[0_0_24px_rgba(198,255,0,0.22)] transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Play Now
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
