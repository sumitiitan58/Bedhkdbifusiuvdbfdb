import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  generateCustomAiGame,
  type AiGameDifficulty,
  type AiGameFormat,
  type AiGeneratedGamePayload,
} from '../../lib/ai-game-generator';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import type { EloSubjectKey } from '../../utils/arenaProgression';
import { playAiSparkle, playClick, playSuccess, playWarning } from '../../utils/soundEffects';

const EXAMS = ['JEE Main', 'JEE Adv', 'NEET UG', 'Class 9–12'] as const;
const SUBJECT_CHAPTERS: Record<string, string[]> = {
  Physics: [
    'Rotational Dynamics',
    'Electrostatics & Capacitors',
    'Current Electricity',
    'Modern Physics',
    'Thermodynamics & KTG',
    'Ray & Wave Optics',
  ],
  Chemistry: [
    'Aldehydes & Ketones',
    'Chemical Bonding & MOT',
    'Coordination Compounds',
    'Chemical Kinetics',
    'Electrochemistry',
    'GOC & Hydrocarbons',
  ],
  Mathematics: [
    'Definite Integration',
    'Vectors & 3D Geometry',
    'Matrices & Determinants',
    'Complex Numbers',
    'Conic Sections',
  ],
  Biology: [
    'Molecular Basis of Inheritance',
    'Principles of Inheritance',
    'Human Physiology',
    'Biotechnology Principles',
    'Plant Kingdom',
  ],
};
const FORMATS: AiGameFormat[] = [
  'Rapid-Fire Blitz',
  'Match-the-Pairs',
  'Spot-the-Error',
  'Reaction Chain',
];
const DIFFICULTIES: AiGameDifficulty[] = ['Easy', 'Exam-Level', 'Ranker'];

function mapSubjectToElo(subject: string): EloSubjectKey {
  if (subject === 'Physics') return 'physics';
  if (subject === 'Chemistry') return 'chemistry';
  return 'mathsBio';
}

export function AiCustomGamePlayer() {
  const { recordArenaGameResult } = usePrepskm2();

  const [exam, setExam] = useState<string>('JEE Main');
  const [subject, setSubject] = useState<string>('Chemistry');
  const [chapter, setChapter] = useState<string>('Aldehydes & Ketones');
  const [customChapter, setCustomChapter] = useState<string>('');
  const [format, setFormat] = useState<AiGameFormat>('Rapid-Fire Blitz');
  const [difficulty, setDifficulty] = useState<AiGameDifficulty>('Exam-Level');

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [game, setGame] = useState<AiGeneratedGamePayload | null>(null);

  // Active play state
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [finished, setFinished] = useState(false);
  const [eloSummary, setEloSummary] = useState<{ delta: number; newRating: number } | null>(null);

  const currentQuestion = game?.questions[index] ?? null;

  useEffect(() => {
    if (!game || finished || selectedOption !== null || !currentQuestion) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setSelectedOption(-1);
          setCombo(0);
          playWarning();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game, finished, selectedOption, currentQuestion]);

  const handleGenerate = async () => {
    setErrorMsg('');
    setGenerating(true);
    playAiSparkle();
    const targetChapter = customChapter.trim() || chapter;
    try {
      const payload = await generateCustomAiGame({
        exam,
        subject,
        chapter: targetChapter,
        format,
        difficulty,
        questionCount: 5,
      });
      setGame(payload);
      setIndex(0);
      setTimeLeft(payload.questions[0]?.timeLimitSeconds ?? 25);
      setSelectedOption(null);
      setShowHint(false);
      setCombo(0);
      setMaxCombo(0);
      setCorrectCount(0);
      setPoints(0);
      setFinished(false);
      setEloSummary(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not generate AI game right now. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (optIdx: number) => {
    if (!currentQuestion || selectedOption !== null) return;
    setSelectedOption(optIdx);
    const isRight = optIdx === currentQuestion.correctIndex;
    if (isRight) {
      const nextCombo = combo + 1;
      const mult = nextCombo >= 5 ? 5 : nextCombo >= 3 ? 3 : nextCombo >= 2 ? 2 : 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setCorrectCount((c) => c + 1);
      setPoints((p) => p + 100 * mult + timeLeft * 4);
      playSuccess();
    } else {
      setCombo(0);
      playWarning();
    }
  };

  const handleNext = () => {
    if (!game) return;
    playClick();
    if (index + 1 >= game.questions.length) {
      setFinished(true);
      const accuracy = correctCount / Math.max(1, game.questions.length);
      const diffRating = difficulty === 'Ranker' ? 1280 : difficulty === 'Easy' ? 960 : 1120;
      const earnedXp = Math.round(game.xpReward * (0.4 + accuracy * 0.8));
      const res = recordArenaGameResult({
        gameName: `${game.chapter} (${game.format})`,
        subject: mapSubjectToElo(game.subject),
        score: points,
        accuracyRatio: accuracy,
        maxCombo,
        xpEarned: earnedXp,
        difficultyRating: diffRating,
      });
      setEloSummary({ delta: res.eloDelta, newRating: res.newRating });
    } else {
      const nextIdx = index + 1;
      setIndex(nextIdx);
      setTimeLeft(game.questions[nextIdx]?.timeLimitSeconds ?? 25);
      setSelectedOption(null);
      setShowHint(false);
    }
  };

  const comboMult = combo >= 5 ? '5x' : combo >= 3 ? '3x' : combo >= 2 ? '2x' : '1x';

  return (
    <div className="space-y-5">
      {/* Generator Controls */}
      <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              AI Custom Game Generator
            </p>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              Build Any Chapter Game
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Pick an exam, subject, chapter, format, and difficulty — Gemini generates a playable JSON study game immediately.
            </p>
          </div>
          {game && (
            <button
              type="button"
              onClick={() => {
                playClick();
                setGame(null);
                setFinished(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:border-indigo-500"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Game Setup
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <label htmlFor="ai-game-exam" className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              1. Exam Target
            </label>
            <select
              id="ai-game-exam"
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm font-medium text-slate-900 dark:text-zinc-100"
            >
              {EXAMS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-game-subject" className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              2. Subject
            </label>
            <select
              id="ai-game-subject"
              value={subject}
              onChange={(e) => {
                const nextSub = e.target.value;
                setSubject(nextSub);
                setChapter(SUBJECT_CHAPTERS[nextSub]?.[0] ?? 'Core Concepts');
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm font-medium text-slate-900 dark:text-zinc-100"
            >
              {Object.keys(SUBJECT_CHAPTERS).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-game-chapter" className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              3. Chapter
            </label>
            <select
              id="ai-game-chapter"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm font-medium text-slate-900 dark:text-zinc-100"
            >
              {(SUBJECT_CHAPTERS[subject] ?? []).map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-game-format" className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              4. Game Format
            </label>
            <select
              id="ai-game-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as AiGameFormat)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm font-medium text-slate-900 dark:text-zinc-100"
            >
              {FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[220px]">
            <input
              type="text"
              value={customChapter}
              onChange={(e) => setCustomChapter(e.target.value)}
              placeholder="Or type any custom chapter/topic (e.g. Ray Optics Prism)..."
              className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08]">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    difficulty === diff
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? 'Generating Game...' : 'Generate Playable Game'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Live Game Stage */}
      {game && !finished && currentQuestion && (
        <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
              <span className="font-bold text-slate-900 dark:text-white">{game.title}</span>
              <span>·</span>
              <span>
                Q{index + 1}/{game.questions.length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                <Flame className="w-3.5 h-3.5" />
                {comboMult} Combo
              </span>
              <span className="text-emerald-500 font-bold">{points} pts</span>
              <span className={timeLeft <= 6 ? 'text-rose-500 font-bold' : 'text-indigo-500 font-bold'}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* Live Countdown Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 6 ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{
                width: `${Math.max(0, (timeLeft / Math.max(1, currentQuestion.timeLimitSeconds)) * 100)}%`,
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {game.exam} · {game.subject} · {game.format} · {game.difficulty}
            </p>
            <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {currentQuestion.prompt}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, optIdx) => {
              const revealed = selectedOption !== null;
              const isCorrect = optIdx === currentQuestion.correctIndex;
              const isPicked = optIdx === selectedOption;
              let cardClass =
                'border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#09090B] hover:border-indigo-500 text-slate-900 dark:text-zinc-100';
              if (revealed && isCorrect) {
                cardClass =
                  'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
              } else if (revealed && isPicked && !isCorrect) {
                cardClass = 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300';
              }
              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`text-left px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between gap-2 ${cardClass}`}
                >
                  <span>
                    <span className="font-mono text-xs opacity-70 mr-2">
                      {['A', 'B', 'C', 'D'][optIdx] ?? optIdx + 1}.
                    </span>
                    {opt}
                  </span>
                  {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />}
                  {revealed && isPicked && !isCorrect && (
                    <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            {selectedOption === null ? (
              <button
                type="button"
                onClick={() => setShowHint((h) => !h)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showHint ? 'Hide Hint' : 'Show Concept Hint'}
              </button>
            ) : (
              <p className="text-xs text-slate-600 dark:text-zinc-300 flex-1 leading-relaxed">
                <strong className="text-slate-900 dark:text-white">Explanation:</strong>{' '}
                {currentQuestion.explanation}
              </p>
            )}

            {selectedOption !== null && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
              >
                {index + 1 >= game.questions.length ? 'Finish & Claim XP' : 'Next Question'}
              </button>
            )}
          </div>

          {showHint && selectedOption === null && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
              Hint: {currentQuestion.hint}
            </div>
          )}
        </div>
      )}

      {/* Finished Summary */}
      {game && finished && (
        <div className="rounded-2xl bg-white dark:bg-[#111114] border border-emerald-500/30 p-6 text-center space-y-4">
          <Trophy className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {game.title} Complete!
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-sm tabular-nums">
            <span>
              Accuracy:{' '}
              <strong className="text-emerald-500">
                {correctCount}/{game.questions.length}
              </strong>
            </span>
            <span>
              Score: <strong className="text-indigo-500">{points} pts</strong>
            </span>
            <span>
              Peak Combo: <strong className="text-amber-500">{maxCombo}x</strong>
            </span>
            {eloSummary && (
              <span>
                {game.subject} Elo:{' '}
                <strong className="text-emerald-500">
                  {eloSummary.newRating} ({eloSummary.delta >= 0 ? `+${eloSummary.delta}` : eloSummary.delta})
                </strong>
              </span>
            )}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
            >
              Generate Fresh Round
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
