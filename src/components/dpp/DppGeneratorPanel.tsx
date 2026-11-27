import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Play,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { MockTestRecord, StudentCohortId, TestQuestionRecord } from '../../types';
import {
  generateTailoredChapterDpp,
  loadSavedGeneratedDpps,
  saveGeneratedDppBundle,
  type GeneratedDppBundle,
} from '../../utils/customMockAndDppEngine';
import { playClick, playSuccess } from '../../utils/soundEffects';

interface DppGeneratorPanelProps {
  cohortId: StudentCohortId;
  subjects: Array<{ id: string; name: string }>;
  chapters: Array<{ id: string; subjectId: string; name: string }>;
  allQuestions: TestQuestionRecord[];
  defaultSubjectName?: string;
  defaultChapterName?: string;
  compact?: boolean;
  onLaunchDpp: (test: MockTestRecord, questions: TestQuestionRecord[]) => void;
}

const QUESTION_COUNTS = [10, 15, 20, 25] as const;
const DIFFICULTIES = ['Concept Builder', 'JEE/NEET Mains', 'Advanced Tough'] as const;

export function DppGeneratorPanel({
  cohortId,
  subjects,
  chapters,
  allQuestions,
  defaultSubjectName,
  defaultChapterName,
  compact = false,
  onLaunchDpp,
}: DppGeneratorPanelProps) {
  const uniqueSubjects = useMemo(() => {
    const names = Array.from(
      new Set(
        subjects.length > 0
          ? subjects.map((s) => s.name)
          : ['Physics', 'Chemistry', 'Mathematics', 'Biology']
      )
    );
    return names;
  }, [subjects]);

  const [subjectName, setSubjectName] = useState<string>(
    defaultSubjectName && uniqueSubjects.includes(defaultSubjectName)
      ? defaultSubjectName
      : uniqueSubjects[0] ?? 'Physics'
  );
  const [chapterInput, setChapterInput] = useState<string>(defaultChapterName ?? '');
  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNTS)[number]>(15);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('JEE/NEET Mains');
  const [includeNumerical, setIncludeNumerical] = useState<boolean>(true);
  const [savedBundles, setSavedBundles] = useState<GeneratedDppBundle[]>(() =>
    loadSavedGeneratedDpps()
  );
  const [justGenerated, setJustGenerated] = useState<GeneratedDppBundle | null>(null);

  const chapterSuggestions = useMemo(() => {
    const subMatch = subjects.find((s) => s.name.toLowerCase() === subjectName.toLowerCase());
    const filtered = subMatch
      ? chapters.filter((c) => c.subjectId === subMatch.id)
      : chapters;
    return filtered.slice(0, 20);
  }, [chapters, subjectName, subjects]);

  const effectiveChapter =
    chapterInput.trim() || chapterSuggestions[0]?.name || `${subjectName} Core Concepts`;

  const handleGenerate = () => {
    playSuccess();
    const matchedSub = subjects.find((s) => s.name.toLowerCase() === subjectName.toLowerCase());
    const matchedCh = chapterSuggestions.find(
      (c) => c.name.toLowerCase() === effectiveChapter.toLowerCase()
    );
    const bundle = generateTailoredChapterDpp(
      {
        subjectName,
        chapterName: effectiveChapter,
        cohortId,
        questionCount,
        difficulty,
        includeNumerical,
        subjectId: matchedSub?.id,
        chapterId: matchedCh?.id,
      },
      allQuestions
    );
    const updated = saveGeneratedDppBundle(bundle);
    setSavedBundles(updated);
    setJustGenerated(bundle);
  };

  const handleDeleteSaved = (id: string) => {
    playClick();
    const next = savedBundles.filter((b) => b.test.id !== id);
    setSavedBundles(next);
    try {
      window.localStorage.setItem('prepskm2_generated_dpps_v1', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    if (justGenerated?.test.id === id) setJustGenerated(null);
  };

  return (
    <section
      data-testid="dpp-generator-panel"
      className={`preps-glass-panel rounded-2xl ${compact ? 'p-4 space-y-3.5' : 'p-5 sm:p-6 space-y-5'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/70 dark:border-white/10 pb-3.5">
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D56C6] dark:text-[#00B4FF]">
            Instant Zero-Cost Chapter Builder
          </p>
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#0E234E] dark:text-white mt-0.5">
            Generate Tailored Chapter DPP
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          KaTeX Solutions · +4/-1 Timed CBT
        </span>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Subject */}
        <div className="md:col-span-3 space-y-1">
          <label htmlFor="gen-dpp-subject" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Subject
          </label>
          <select
            id="gen-dpp-subject"
            value={subjectName}
            onChange={(e) => {
              setSubjectName(e.target.value);
              setChapterInput('');
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-[#070C1A]/85 text-sm font-semibold"
          >
            {uniqueSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter picker / custom input */}
        <div className="md:col-span-5 space-y-1">
          <label htmlFor="gen-dpp-chapter" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Any Chapter (Pick or Type Custom)
          </label>
          <input
            id="gen-dpp-chapter"
            list="gen-dpp-chapter-list"
            type="text"
            value={chapterInput}
            onChange={(e) => setChapterInput(e.target.value)}
            placeholder={chapterSuggestions[0]?.name || 'e.g. Rotational Motion, Aldol Condensation'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-[#070C1A]/85 text-sm"
          />
          <datalist id="gen-dpp-chapter-list">
            {chapterSuggestions.map((ch) => (
              <option key={ch.id} value={ch.name} />
            ))}
          </datalist>
        </div>

        {/* Question Count */}
        <div className="md:col-span-4 space-y-1">
          <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Practice Length
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {QUESTION_COUNTS.map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => {
                  playClick();
                  setQuestionCount(cnt);
                }}
                className={`py-2 rounded-xl border font-mono text-xs font-bold transition-colors ${
                  questionCount === cnt
                    ? 'bg-[#1D56C6] border-[#00B4FF] text-white'
                    : 'bg-white/70 dark:bg-[#070C1A]/75 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#00B4FF]/50'
                }`}
              >
                {cnt}Q
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Difficulty + NAT toggle + Generate CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-[#070C1A]/80 border border-slate-200/80 dark:border-white/10">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => {
                  playClick();
                  setDifficulty(diff);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  difficulty === diff
                    ? 'bg-[#0E234E] dark:bg-[#00B4FF] text-white dark:text-[#070A12] font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              playClick();
              setIncludeNumerical((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              includeNumerical
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            MCQ + Integer NAT: {includeNumerical ? 'On' : 'Off'}
          </button>
        </div>

        <button
          type="button"
          data-testid="generate-dpp-btn"
          onClick={handleGenerate}
          className="preps-3d-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-sky-300 text-[#070A12] text-sm font-extrabold whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          Generate DPP ({questionCount}Q)
        </button>
      </div>

      {/* Freshly Generated DPP Callout */}
      {justGenerated && (
        <div
          data-testid="generated-dpp-ready"
          className="rounded-xl bg-emerald-500/15 border border-emerald-400/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0E234E] dark:text-white truncate">
                Ready: {justGenerated.test.title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                {justGenerated.questions.length} Qs · {justGenerated.test.durationMinutes} min · +4/-1 with Solutions
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="solve-generated-dpp-btn"
            onClick={() => {
              playClick();
              onLaunchDpp(justGenerated.test, justGenerated.questions);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            Solve Generated DPP
          </button>
        </div>
      )}

      {/* Saved Tailored DPPs Shelf */}
      {savedBundles.length > 0 && !compact && (
        <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Your Tailored Generated DPPs ({savedBundles.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {savedBundles.slice(0, 6).map((bundle) => (
              <div
                key={bundle.test.id}
                className="p-3 rounded-xl bg-white/70 dark:bg-[#070C1A]/75 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-2.5"
              >
                <div>
                  <p className="text-xs font-bold text-[#0E234E] dark:text-white leading-snug">
                    {bundle.test.title}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    {bundle.questions.length} Qs · {bundle.test.durationMinutes}m · {bundle.test.examCategory}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      onLaunchDpp(bundle.test, bundle.questions);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D56C6] hover:bg-[#00B4FF] hover:text-[#070A12] text-white text-xs font-bold transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Start DPP
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${bundle.test.title}`}
                    onClick={() => handleDeleteSaved(bundle.test.id)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
