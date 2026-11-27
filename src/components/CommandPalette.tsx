import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  BookOpenCheck,
  ClipboardCheck,
  Command,
  CreditCard,
  Focus,
  Gamepad2,
  MessageSquare,
  Search,
  Sparkles,
  SunMoon,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { useTheme } from '../hooks/useTheme';
import { MASTERY_CHAPTERS_48, VERIFIED_MENTORS } from '../data/prepskm2Data';
import { playClick, playNav } from '../utils/soundEffects';

interface PaletteAction {
  id: string;
  group: 'Navigation' | 'Learn & PYQs' | 'Arena Games' | 'Chapters (48)' | 'Mentors' | 'Quick Actions';
  title: string;
  subtitle: string;
  keywords: string;
  icon: typeof Search;
  run: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    toggleZenMode,
    setCopilotOpen,
  } = usePrepskm2();
  const { toggleTheme, theme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandPaletteOpen]);

  const allItems = useMemo<PaletteAction[]>(() => {
    const go = (path: string) => {
      playNav();
      setCommandPaletteOpen(false);
      navigate(path);
    };

    const navItems: PaletteAction[] = [
      {
        id: 'nav-home',
        group: 'Navigation',
        title: 'Home — Prepskm 2.0 Study OS',
        subtitle: 'Hero, Daily Trifecta, Tabbed Study Deck & 5-Space Quick Launch',
        keywords: 'dashboard home formula percentile rank trifecta',
        icon: Command,
        run: () => go('/'),
      },
      {
        id: 'nav-learn',
        group: 'Navigation',
        title: 'Learn & PYQs Hub',
        subtitle: 'Concept-Mapped PYQs, 2027 High-Yield Predictor & NCERT-to-PYQ Mapper',
        keywords: 'learn pyq concept predictor 2027 ncert hindi bilingual',
        icon: BookOpen,
        run: () => go('/learn'),
      },
      {
        id: 'nav-cbt',
        group: 'Navigation',
        title: 'NTA CBT Mock Test Engine',
        subtitle: 'Custom 10Q/25Q/45Q generator, authentic +4/-1 mode & Tilt diagnostics',
        keywords: 'cbt mock test nta jee neet tilt detector time sink sm2',
        icon: ClipboardCheck,
        run: () => go('/cbt-mocks'),
      },
      {
        id: 'nav-community',
        group: 'Navigation',
        title: 'Live Peer Community & JoSAA/MCC Counselling',
        subtitle: 'Exam rooms (#jee-2027, #neet-2027), Study Peers & Rank-to-College Cut-offs',
        keywords: 'community peers doubts josaa mcc counselling iit nit aiims cutoffs',
        icon: MessageSquare,
        run: () => go('/community'),
      },
      {
        id: 'nav-mentors',
        group: 'Navigation',
        title: '1:1 IIT/AIIMS Mentors & Consultation Passes',
        subtitle: 'Verified IIT Bombay/Delhi & AIIMS Delhi mentors (₹129–₹149 / 15 min)',
        keywords: 'mentors 1:1 webrtc consultation pass iit aiims',
        icon: Users,
        run: () => go('/mentors'),
      },
      {
        id: 'nav-pricing',
        group: 'Navigation',
        title: 'Transparent Pricing — Free Forever & Prepskm Pro',
        subtitle: 'Compare Free Forever (₹0), Prepskm Pro (₹499/yr), and 1:1 Mentorship',
        keywords: 'pricing plans pro free upgrade subscription billing',
        icon: CreditCard,
        run: () => go('/pricing'),
      },
      {
        id: 'nav-arena',
        group: 'Navigation',
        title: 'Apex Arena — 1v1 AI Duels & Sunday Blitz',
        subtitle: 'Quantum Clash, Synthesis Strike, Logic Labyrinth & Global ELO Leaderboards',
        keywords: 'arena games reaction formula blitz sunday elo leaderboard',
        icon: Gamepad2,
        run: () => go('/arena'),
      },
    ];

    const learnItems: PaletteAction[] = [
      {
        id: 'learn-predictor',
        group: 'Learn & PYQs',
        title: '2027 High-Yield Chapter Predictor',
        subtitle: 'Recharts weightage chart & Priority 1/2/3 roadmap for JEE & NEET 2027',
        keywords: '2027 predictor high yield weightage priority tier chart',
        icon: TrendingUp,
        run: () => go('/learn?tab=predictor'),
      },
      {
        id: 'learn-ncert',
        group: 'Learn & PYQs',
        title: 'NCERT-to-PYQ Split-Pane Mapper',
        subtitle: 'Click highlighted Class 11/12 NCERT lines to solve exact linked PYQs',
        keywords: 'ncert to pyq mapper biology chemistry physics highlight lines',
        icon: BookOpenCheck,
        run: () => go('/learn?tab=ncert'),
      },
    ];

    const quickItems: PaletteAction[] = [
      {
        id: 'act-zen',
        group: 'Quick Actions',
        title: 'Enter Zen Focus Mode',
        subtitle: 'Hide sidebars & distractions — keep only Focus Timer + Scratchpad',
        keywords: 'zen study mode distraction free focus pomodoro scratchpad',
        icon: Focus,
        run: () => {
          playClick();
          setCommandPaletteOpen(false);
          toggleZenMode();
        },
      },
      {
        id: 'act-copilot',
        group: 'Quick Actions',
        title: 'Open PrepsBot • 3D AI Mentor',
        subtitle: 'Drop doubt screenshot, Step-2 hints, Formula Only, or 3 similar PYQs',
        keywords: 'prepsbot copilot gemini image doubt hint similar questions',
        icon: Sparkles,
        run: () => {
          playClick();
          setCommandPaletteOpen(false);
          setCopilotOpen(true);
        },
      },
      {
        id: 'act-theme',
        group: 'Quick Actions',
        title: theme === 'dark' ? 'Switch to Light Study OS Mode' : 'Switch to Dark Focus Mode',
        subtitle: 'Toggle between Dark (#070B14) and Bright Pastel Light (#F4F8FF)',
        keywords: 'theme dark light mode switch',
        icon: SunMoon,
        run: () => {
          playClick();
          toggleTheme();
          setCommandPaletteOpen(false);
        },
      },
    ];

    const mentorItems: PaletteAction[] = VERIFIED_MENTORS.map((m) => ({
      id: `mentor-${m.id}`,
      group: 'Mentors',
      title: `${m.name} — ${m.collegeBadge}`,
      subtitle: `${m.airLabel} · ${m.headline}`,
      keywords: `${m.name} ${m.collegeBadge} ${m.examFocus} ${m.specialties.join(' ')}`,
      icon: Users,
      run: () => go(`/mentors?mentor=${encodeURIComponent(m.id)}`),
    }));

    const chapterItems: PaletteAction[] = MASTERY_CHAPTERS_48.map((ch) => ({
      id: `ch-${ch.id}`,
      group: 'Chapters (48)',
      title: ch.name,
      subtitle: `${ch.subject} · ${ch.classLevel} · ${ch.weightageMarks} Marks Weightage`,
      keywords: `${ch.name} ${ch.subject} ${ch.classLevel} ${ch.exams.join(' ')}`,
      icon: BookOpen,
      run: () => go(`/learn?tab=pyqs&chapter=${encodeURIComponent(ch.name)}`),
    }));

    return [...quickItems, ...navItems, ...learnItems, ...mentorItems, ...chapterItems];
  }, [navigate, setCommandPaletteOpen, toggleZenMode, setCopilotOpen, theme, toggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 12);
    const terms = q.split(/\s+/).filter(Boolean);
    return allItems
      .filter((item) => {
        const hay = `${item.title} ${item.subtitle} ${item.keywords} ${item.group}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 18);
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Global command palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCommandPaletteOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E8F0] dark:border-white/[0.08]">
              <Search className="w-4 h-4 text-[#0284C7] dark:text-[#06B6D4] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex((idx) => Math.min(filtered.length - 1, idx + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex((idx) => Math.max(0, idx - 1));
                  } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                    e.preventDefault();
                    filtered[selectedIndex].run();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setCommandPaletteOpen(false);
                  }
                }}
                placeholder="Search chapters, PYQs, 2027 Predictor, CBT mocks, mentors, counselling..."
                className="flex-1 bg-transparent text-sm text-[#0B1F3A] dark:text-[#F8FAFC] placeholder:text-[#475569] dark:placeholder:text-[#94A3B8] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                aria-label="Close command palette"
                className="p-1.5 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:bg-[#EEF4FF] dark:hover:bg-[#162033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#475569] dark:text-[#94A3B8]">
                  No chapters, PYQs, or tools match &ldquo;{query}&rdquo;.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={item.run}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                        active
                          ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                          : 'text-[#0B1F3A] dark:text-[#F8FAFC] hover:bg-[#EEF4FF] dark:hover:bg-[#162033]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active
                              ? 'text-white dark:text-[#070B14]'
                              : 'text-[#0284C7] dark:text-[#06B6D4]'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.title}</p>
                          <p
                            className={`text-xs truncate ${
                              active
                                ? 'text-white/85 dark:text-[#070B14]/80'
                                : 'text-[#475569] dark:text-[#94A3B8]'
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-mono shrink-0 ${
                          active
                            ? 'text-white/90 dark:text-[#070B14]/80'
                            : 'text-[#475569] dark:text-[#94A3B8]'
                        }`}
                      >
                        {item.group}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#475569] dark:text-[#94A3B8] font-mono">
              <span>↑↓ Navigate · Enter Open · Esc Close</span>
              <span>Prepskm 2.0 Search</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
