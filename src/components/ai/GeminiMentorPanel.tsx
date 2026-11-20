import { useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { ReusableCard } from '../ReusableCard';
import { ReusableButton } from '../ReusableButton';
import {
  requestGeminiMentor,
  type GeminiMentorResponse,
} from '../../services/geminiClient';
import { playAiSparkle, playClick } from '../../utils/soundEffects';

interface GeminiMentorPanelProps {
  studentName: string;
  cohortLabel: string;
  attemptsCount: number;
  averageAccuracy: number;
  averageIqScore: number;
  latestIqScore: number;
  paceSummary: { tooFast: number; optimal: number; tooSlow: number; unattempted: number };
  subjectPerformance: Array<{ subject: string; accuracy: number; scorePct: number }>;
  weakChapters: Array<{ chapterName: string; subjectName: string; accuracy: number }>;
  weeklyCompletionPercent: number;
  compact?: boolean;
}

const QUICK_PROMPTS = [
  'Kya jaruri hai aur kya skip karu right now?',
  'How do I boost my Exam IQ & stop rushing?',
  'High-weightage revision strategy for next 7 days',
];

export function GeminiMentorPanel({
  studentName,
  cohortLabel,
  attemptsCount,
  averageAccuracy,
  averageIqScore,
  latestIqScore,
  paceSummary,
  subjectPerformance,
  weakChapters,
  weeklyCompletionPercent,
  compact = false,
}: GeminiMentorPanelProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeminiMentorResponse | null>(null);

  const runAnalysis = async (customPrompt?: string) => {
    playClick();
    setLoading(true);
    setError(null);
    const activeQuestion = (customPrompt ?? question).trim();

    try {
      const mentor = await requestGeminiMentor({
        studentName,
        cohortLabel,
        attemptsCount,
        averageAccuracy,
        averageIqScore,
        latestIqScore,
        paceSummary,
        subjectPerformance,
        weakChapters: weakChapters.slice(0, 6),
        weeklyCompletionPercent,
        userQuestion: activeQuestion || undefined,
      });
      setResult(mentor);
      playAiSparkle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach Gemini AI right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReusableCard
      padding="sm"
      className="border-[#2563EB]/30 dark:border-sky-500/30 bg-gradient-to-br from-white via-blue-50/40 to-orange-50/30 dark:from-[#111A2E] dark:via-[#111D38] dark:to-[#161B2E] space-y-3.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            Gemini AI Study &amp; IQ Strategist
          </p>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#2563EB] dark:text-sky-400 shrink-0" />
            <span>Kya Jaruri Hai · Kya Nahi · Exam IQ Coach</span>
          </h2>
          {!compact && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Analyzes your real track ({cohortLabel}), {attemptsCount} test attempt(s), pacing, and weak chapters using Gemini AI.
            </p>
          )}
        </div>

        <ReusableButton
          variant="primary"
          size="sm"
          disabled={loading}
          onClick={() => void runAnalysis('')}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Analyzing...' : result ? 'Refresh AI Plan' : 'Analyze My IQ & Priorities'}
        </ReusableButton>
      </div>

      {/* Quick Prompt Chips + Custom Ask Bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuestion(chip);
                void runAnalysis(chip);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!question.trim() || loading) return;
            void runAnalysis(question);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="gemini-mentor-input" className="sr-only">
            Ask Gemini AI Mentor
          </label>
          <input
            id="gemini-mentor-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Gemini: e.g. Physics Electrostatics ya Rotational pehle karu?"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            aria-label="Ask Gemini Mentor"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-blue-200/70 dark:border-slate-700 space-y-1">
            <p className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
              {result.headline}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-[#2563EB] dark:text-sky-400">IQ &amp; Pace Diagnosis: </strong>
              {result.iqDiagnosis}
            </p>
            {result.directAnswer && (
              <p className="text-xs text-slate-700 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                <strong className="text-[#F97316]">Mentor Note: </strong>
                {result.directAnswer}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Kya Jaruri Hai */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/70 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                Kya Jaruri Hai (Must-Do Priorities)
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                {result.mustDoPriorities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-[#10B981] font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kya Jaruri Nahi Hai */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-[#F97316]" />
                Kya Jaruri Nahi Hai (Skip / Avoid)
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                {result.avoidOrSkip.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-[#F97316] font-bold">×</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 7-Day Action Plan */}
          {result.sevenDayPlan && result.sevenDayPlan.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                Upcoming Action Plan
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {result.sevenDayPlan.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
                  >
                    <p className="font-mono text-[11px] font-bold text-[#F97316]">{step.day}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 leading-snug">
                      {step.focus}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ReusableCard>
  );
}
