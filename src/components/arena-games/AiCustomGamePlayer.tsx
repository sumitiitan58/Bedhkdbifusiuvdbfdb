import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
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
import { RichMathText } from '../math/KatexFormula';
import {
  ArcadeStageShell,
  getComboMultiplier,
  triggerComboConfetti,
  type FloatingXpBurst,
} from './ArcadeStageShell';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import type { EloSubjectKey } from '../../utils/arenaProgression';
import {
  playAiSparkle,
  playArcadeWrong,
  playClick,
  playComboChime,
} from '../../utils/soundEffects';

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
  'Formula Blitz',
  'Reaction Chain',
  'NCERT Line-Trap',
  'Rapid-Fire Blitz',
];
const DIFFICULTIES: AiGameDifficulty[] = ['Easy', 'Exam-Level', 'Ranker'];

function mapSubjectToElo(subject: string): EloSubjectKey {
  if (subject === 'Physics') return 'physics';
  if (subject === 'Chemistry') return 'chemistry';
  return 'mathsBio';
}

export function AiCustomGamePlayer() {
  const { progression, recordArenaGameResult } = usePrepskm2();

  const [exam, setExam] = useState<string>('JEE Main');
  const [subject, setSubject] = useState<string>('Chemistry');
  const [chapter, setChapter] = useState<string>('Aldehydes & Ketones');
  const [customChapter, setCustomChapter] = useState<string>('');
  const [format, setFormat] = useState<AiGameFormat>('Formula Blitz');
  const [difficulty, setDifficulty] = useState<AiGameDifficulty>('Exam-Level');

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [game, setGame] = useState<AiGeneratedGamePayload | null>(null);

  // Active arcade play state
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
  const [xpBurst, setXpBurst] = useState<FloatingXpBurst | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);

  const currentQuestion = game?.questions[index] ?? null;

  useEffect(() => {
    if (!game || finished || selectedOption !== null || !currentQuestion) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setSelectedOption(-1);
          setCombo(0);
          setShakeKey((k) => k + 1);
          setWrongFeedback(`Time expired! ${currentQuestion.explanation}`);
          playArcadeWrong();
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
      setWrongFeedback(null);
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

  const handleSelectOption = useCallback(
    (optIdx: number) => {
      if (!currentQuestion || selectedOption !== null) return;
      setSelectedOption(optIdx);
      const isRight = optIdx === currentQuestion.correctIndex;
      if (isRight) {
        const nextCombo = combo + 1;
        const mult = getComboMultiplier(nextCombo);
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        setCorrectCount((c) => c + 1);
        setPoints((p) => p + 100 * mult + timeLeft * 4);
        setWrongFeedback(null);
        setRippleKey((k) => k + 1);
        setXpBurst({ id: Date.now(), label: `+${25 * mult} XP` });
        playComboChime(nextCombo);
        triggerComboConfetti(nextCombo);
      } else {
        setCombo(0);
        setShakeKey((k) => k + 1);
        setWrongFeedback(currentQuestion.explanation);
        playArcadeWrong();
      }
    },
    [currentQuestion, selectedOption, combo, timeLeft]
  );

  const handleNext = useCallback(() => {
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
      setWrongFeedback(null);
    }
  }, [game, index, correctCount, difficulty, points, maxCombo, recordArenaGameResult]);

  // Keyboard 1-4 option selection during AI game
  useEffect(() => {
    if (!game || finished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && selectedOption === null) {
        e.preventDefault();
        handleSelectOption(n - 1);
      } else if (e.key === 'Enter' && selectedOption !== null) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game, finished, selectedOption, handleSelectOption, handleNext]);

  const subjectElo =
    subject === 'Physics'
      ? progression.elo.physics
      : subject === 'Chemistry'
        ? progression.elo.chemistry
        : progression.elo.mathsBio;

  return (
    <div className="space-y-5">
      {/* Generator Controls */}
      <div className="rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200 dark:border-[#00B4FF]/[0.18] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1D56C6] dark:text-[#00B4FF]">
              AI Custom Game Generator
            </p>
            <h2 className="font-display text-xl font-extrabold text-[#0E234E] dark:text-white mt-0.5">
              Generate Any Chapter Game
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pick Exam, Subject, Chapter, Arcade Mode &amp; Difficulty — launches immediately in the Arcade Stage.
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#00B4FF]/30 text-xs font-bold text-[#00B4FF] hover:bg-[#00B4FF]/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Setup
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <label htmlFor="ai-game-exam" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              1. Exam Target
            </label>
            <select
              id="ai-game-exam"
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/15 text-sm font-semibold text-slate-900 dark:text-white focus:border-[#00B4FF] focus:outline-none"
            >
              {EXAMS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-game-subject" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
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
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/15 text-sm font-semibold text-slate-900 dark:text-white focus:border-[#00B4FF] focus:outline-none"
            >
              {Object.keys(SUBJECT_CHAPTERS).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-game-chapter" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              3. Chapter
            </label>
            <select
              id="ai-game-chapter"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/15 text-sm font-semibold text-slate-900 dark:text-white focus:border-[#00B4FF] focus:outline-none"
            >
              {(SUBJECT_CHAPTERS[subject] ?? []).map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-game-format" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              4. Game Mode
            </label>
            <select
              id="ai-game-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as AiGameFormat)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/15 text-sm font-semibold text-slate-900 dark:text-white focus:border-[#00B4FF] focus:outline-none"
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
              placeholder="Or type any custom chapter (e.g. Ray Optics Prism)..."
              className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/15 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#00B4FF] focus:outline-none"
            />
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#070A12] border border-slate-200 dark:border-white/10">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    difficulty === diff
                      ? 'bg-[#00B4FF] text-[#070A12]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] disabled:opacity-50 text-[#070A12] text-sm font-extrabold transition-all shadow-[0_0_24px_rgba(0,180,255,0.35)] whitespace-nowrap shrink-0"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? 'Synthesizing Stage...' : 'Launch Custom Arcade'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-xs text-[#F43F5E]">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Live Arcade Stage */}
      {game && !finished && currentQuestion && (
        <ArcadeStageShell
          badge={`✨ AI Custom Stage · ${game.exam} · ${game.format} · Q${index + 1}/${game.questions.length}`}
          title={game.title}
          subtitle={`${game.subject} · ${game.chapter} · ${game.difficulty} · Keys 1–4`}
          timeLeft={timeLeft}
          totalTime={currentQuestion.timeLimitSeconds}
          combo={combo}
          score={points}
          elo={subjectElo}
          xpBurst={xpBurst}
          rippleKey={rippleKey}
          shakeKey={shakeKey}
          wrongFeedback={wrongFeedback}
        >
          <div className="p-5 rounded-2xl bg-[#070A12] border border-[#00B4FF]/30">
            <h3 className="font-display text-base sm:text-lg font-bold text-white leading-relaxed">
              <RichMathText text={currentQuestion.prompt} />
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, optIdx) => {
              const revealed = selectedOption !== null;
              const isCorrect = optIdx === currentQuestion.correctIndex;
              const isPicked = optIdx === selectedOption;
              let cardClass =
                'border-[#00B4FF]/25 border-b-[#00B4FF]/50 bg-[#070A12] hover:border-[#00B4FF] text-white';
              if (revealed && isCorrect) {
                cardClass = 'border-[#10B981] border-b-[#059669] bg-[#10B981]/20 text-[#10B981]';
              } else if (revealed && isPicked && !isCorrect) {
                cardClass = 'border-[#F43F5E] border-b-[#E11D48] bg-[#F43F5E]/20 text-[#F43F5E]';
              }
              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`text-left px-4 py-3.5 rounded-xl border-2 border-b-4 active:border-b-2 active:translate-y-[2px] text-sm font-bold transition-all flex items-center justify-between gap-2 ${cardClass}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <kbd className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 font-mono text-[11px] text-[#00B4FF] shrink-0">
                      {optIdx + 1}
                    </kbd>
                    <RichMathText text={opt} />
                  </span>
                  {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />}
                  {revealed && isPicked && !isCorrect && (
                    <XCircle className="w-4 h-4 shrink-0 text-[#F43F5E]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {selectedOption === null ? (
              <button
                type="button"
                onClick={() => setShowHint((h) => !h)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F27B13] hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showHint ? 'Hide Hint' : 'Reveal Concept Hint'}
              </button>
            ) : (
              <p className="text-xs text-slate-300 flex-1 leading-relaxed">
                <strong className="text-[#10B981]">Solution:</strong>{' '}
                <RichMathText text={currentQuestion.explanation} />
              </p>
            )}

            {selectedOption !== null && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-xs font-extrabold shrink-0"
              >
                {index + 1 >= game.questions.length ? 'Finish & Claim XP' : 'Next Stage (Enter) →'}
              </button>
            )}
          </div>

          {showHint && selectedOption === null && (
            <div className="p-3 rounded-xl bg-[#F27B13]/15 border border-[#F27B13]/40 text-xs text-[#F27B13]">
              Hint: <RichMathText text={currentQuestion.hint} />
            </div>
          )}
        </ArcadeStageShell>
      )}

      {/* Finished Summary */}
      {game && finished && (
        <div className="rounded-2xl bg-[#0D1324] border border-[#10B981]/40 p-6 text-center space-y-4">
          <Trophy className="w-10 h-10 text-[#F27B13] mx-auto" />
          <h3 className="font-display text-2xl font-extrabold text-white">
            {game.title} Cleared!
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-sm tabular-nums text-slate-300">
            <span>
              Accuracy:{' '}
              <strong className="text-[#10B981]">
                {correctCount}/{game.questions.length}
              </strong>
            </span>
            <span>
              Score: <strong className="text-[#00B4FF]">{points} pts</strong>
            </span>
            <span>
              Peak Combo: <strong className="text-[#F27B13]">{maxCombo}x</strong>
            </span>
            {eloSummary && (
              <span>
                {game.subject} Elo:{' '}
                <strong className="text-[#10B981]">
                  {eloSummary.newRating} ({eloSummary.delta >= 0 ? `+${eloSummary.delta}` : eloSummary.delta})
                </strong>
              </span>
            )}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="px-5 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-sm font-extrabold"
            >
              Generate Fresh Round
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
