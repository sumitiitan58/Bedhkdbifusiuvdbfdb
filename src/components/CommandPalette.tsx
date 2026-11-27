import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  Command,
  Focus,
  Gamepad2,
  Search,
  Sparkles,
  SunMoon,
  Users,
  X,
} from 'lucide-react';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { useTheme } from '../hooks/useTheme';
import { MASTERY_CHAPTERS_48, VERIFIED_MENTORS } from '../data/prepskm2Data';
import { playClick, playNav } from '../utils/soundEffects';

interface PaletteAction {
  id: string;
  group: 'Navigation' | 'Arena Games' | 'Chapters (48)' | 'Mentors' | 'Quick Actions';
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
        title: 'Home Bento Dashboard',
        subtitle: 'Formula Check, Percentile Slider, Daily Trifecta & Planner',
        keywords: 'dashboard home formula percentile rank trifecta',
        icon: Command,
        run: () => go('/'),
      },
      {
        id: 'nav-arena',
        group: 'Navigation',
        title: 'Prepskm Arena — AI Study Games',
        subtitle: 'AI Custom Game Generator + 5 playable JEE/NEET study games',
        keywords: 'arena games reaction formula blitz ncert boss fight paper scanner elo',
        icon: Gamepad2,
        run: () => go('/arena'),
      },
      {
        id: 'nav-cbt',
        group: 'Navigation',
        title: 'NTA CBT Mock Test Engine',
        subtitle: 'Custom 10Q–180Q generator, authentic NTA light mode & Tilt diagnostics',
        keywords: 'cbt mock test nta jee neet tilt detector time sink sm2',
        icon: ClipboardCheck,
        run: () => go('/cbt-mocks'),
      },
      {
        id: 'nav-materials',
        group: 'Navigation',
        title: 'Study Materials, Formula Sheets & Planner',
        subtitle: '5-Stage Chapter Mastery, Focus Timer, Notes, PYQs & DPPs',
        keywords: 'notes formula sheet mind map pyqs dpp planner focus pomodoro',
        icon: BookOpen,
        run: () => go('/materials'),
      },
      {
        id: 'nav-mentors',
        group: 'Navigation',
        title: '1:1 Mentorship & Aspirant Community',
        subtitle: 'Verified IIT/AIIMS mentors, UPI passes, Doubt Forum & Peer Finder',
        keywords: 'mentors 1:1 webrtc consultation forum community peer finder chat',
        icon: Users,
        run: () => go('/mentors'),
      },
      {
        id: 'nav-ai',
        group: 'Navigation',
        title: 'Preps AI Study Copilot & Mistakes',
        subtitle: 'Full AI chat, Hinglish voice mentor, Sheets analyzer & Mistake Lab',
        keywords: 'preps ai copilot voice mistakes notebook analytics',
        icon: Sparkles,
        run: () => go('/preps-ai'),
      },
    ];

    const arenaItems: PaletteAction[] = [
      {
        id: 'arena-ai-gen',
        group: 'Arena Games',
        title: 'AI Custom Game Generator',
        subtitle: 'Build a playable Rapid-Fire, Match, or Reaction Chain game for any chapter',
        keywords: 'ai custom game generator gemini build chapter game',
        icon: Sparkles,
        run: () => go('/arena?mode=ai-generator'),
      },
      {
        id: 'arena-reaction',
        group: 'Arena Games',
        title: 'Reaction Chain Duel (Chemistry)',
        subtitle: '4-step reagent synthesis ladder in 60s',
        keywords: 'reaction chain duel organic chemistry pcc lialh4 reagent',
        icon: Gamepad2,
        run: () => go('/arena?mode=reaction-chain'),
      },
      {
        id: 'arena-formula',
        group: 'Arena Games',
        title: 'Formula Blitz (Physics & Maths)',
        subtitle: 'Fill missing variables & powers with ms speed + combo multiplier',
        keywords: 'formula blitz physics maths speed combo',
        icon: Gamepad2,
        run: () => go('/arena?mode=formula-blitz'),
      },
      {
        id: 'arena-ncert',
        group: 'Arena Games',
        title: 'NCERT Line-Trap (Bio & Chem)',
        subtitle: 'Tap the single subtly altered word in 20s',
        keywords: 'ncert line trap biology chemistry neet',
        icon: Gamepad2,
        run: () => go('/arena?mode=ncert-trap'),
      },
      {
        id: 'arena-boss',
        group: 'Arena Games',
        title: 'Mistake Boss Fight',
        subtitle: 'Battle your wrong questions from Mistake Notebook (Boss HP 100%)',
        keywords: 'mistake boss fight spaced repetition battle',
        icon: Gamepad2,
        run: () => go('/arena?mode=boss-fight'),
      },
      {
        id: 'arena-scanner',
        group: 'Arena Games',
        title: '15-Minute Paper Scanner Trainer',
        subtitle: 'Rapidly tag 30 questions as Solve Now, Round 2, or Skip Trap',
        keywords: 'paper scanner strategy 30 questions solve now skip trap',
        icon: Gamepad2,
        run: () => go('/arena?mode=paper-scanner'),
      },
    ];

    const quickItems: PaletteAction[] = [
      {
        id: 'act-zen',
        group: 'Quick Actions',
        title: 'Enter 1-Click Zen Study Mode',
        subtitle: 'Hide all sidebars & feeds — keep only Focus Timer + Scratchpad',
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
        title: 'Open Preps AI Slide-Over Copilot',
        subtitle: 'Upload doubt screenshot, stuck-on-step-2 hint, or generate 3 similar Qs',
        keywords: 'copilot slide over gemini image doubt hint similar questions',
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
        title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to OLED Focus Dark Mode',
        subtitle: 'Toggle between Obsidian OLED Dark (#09090B) and Light workspace',
        keywords: 'theme dark oled light mode switch',
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
      run: () => go(`/materials?q=${encodeURIComponent(ch.name.split(' ')[0])}`),
    }));

    return [...quickItems, ...navItems, ...arenaItems, ...mentorItems, ...chapterItems];
  }, [navigate, setCommandPaletteOpen, toggleZenMode, setCopilotOpen, theme, toggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 14);
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

  if (!commandPaletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global command palette"
      className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setCommandPaletteOpen(false);
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.08]">
          <Search className="w-4 h-4 text-indigo-500 shrink-0" />
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
              }
            }}
            placeholder="Jump to any chapter, PYQ, Arena game, CBT mock, mentor, or Zen Mode..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label="Close command palette"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-zinc-400">
              No chapters, games, or tools match &ldquo;{query}&rdquo;.
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
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p
                        className={`text-xs truncate ${
                          active ? 'text-indigo-100' : 'text-slate-500 dark:text-zinc-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-mono shrink-0 ${
                      active ? 'text-indigo-100' : 'text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
          <span>↑↓ Navigate · Enter Select · Esc Close</span>
          <span>Prepskm 2.0 Command</span>
        </div>
      </div>
    </div>
  );
}
