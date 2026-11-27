import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Crop,
  Flame,
  Play,
  Sliders,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { MockTestRecord, TestQuestionRecord } from '../../types';
import { usePlatformData } from '../../context/PlatformDataContext';
import {
  analyzeExamTemperament,
  buildSundayWeaknessKillerQuestions,
} from '../../utils/examTemperamentEngine';
import { getDefaultExamInstructions } from '../../utils/examPresets';
import { playClick, playSuccess } from '../../utils/soundEffects';

interface CustomMockAndTemperamentHubProps {
  onLaunchCustomTest: (test: MockTestRecord, testQuestions: TestQuestionRecord[]) => void;
}

type GeneratorPresetId = 'mini-10' | 'sectional-25' | 'subject-45' | 'jee-full-75' | 'neet-full-180';

const PRESETS: Array<{
  id: GeneratorPresetId;
  label: string;
  count: number;
  duration: number;
  examType: 'JEE Main' | 'NEET UG';
  detail: string;
}> = [
  { id: 'mini-10', label: 'Mini Test', count: 10, duration: 25, examType: 'JEE Main', detail: '10 Qs · 25m' },
  { id: 'sectional-25', label: 'Sectional', count: 25, duration: 60, examType: 'JEE Main', detail: '25 Qs · 60m' },
  { id: 'subject-45', label: 'Subject Test', count: 45, duration: 90, examType: 'NEET UG', detail: '45 Qs · 90m' },
  { id: 'jee-full-75', label: 'Full JEE Main', count: 75, duration: 180, examType: 'JEE Main', detail: '75 Qs · 80% MCQ + 20% NAT' },
  { id: 'neet-full-180', label: 'Full NEET UG', count: 180, duration: 200, examType: 'NEET UG', detail: '180 Qs · 720 Marks' },
];

const CROP_STEPS = [
  { key: 'question', label: '1. Question' },
  { key: 'optA', label: '2. Option A' },
  { key: 'optB', label: '3. Option B' },
  { key: 'optC', label: '4. Option C' },
  { key: 'optD', label: '5. Option D' },
  { key: 'explanation', label: '6. Explanation' },
] as const;

export function CustomMockAndTemperamentHub({
  onLaunchCustomTest,
}: CustomMockAndTemperamentHubProps) {
  const { questions, attempts, resolvedMistakeIds } = usePlatformData();
  const [croppedBank, setCroppedBank] = useState<TestQuestionRecord[]>(() => {
    try {
      const raw = window.localStorage.getItem('prepskm2_cropped_questions_v1');
      return raw ? (JSON.parse(raw) as TestQuestionRecord[]) : [];
    } catch {
      return [];
    }
  });
  const allBankQuestions = useMemo(
    () => [...croppedBank, ...questions],
    [croppedBank, questions]
  );
  const [subTab, setSubTab] = useState<'generator' | 'temperament' | 'cropper'>('generator');

  // Custom Mock Generator state
  const [presetId, setPresetId] = useState<GeneratorPresetId>('mini-10');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Physics',
    'Chemistry',
    'Mathematics',
  ]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  // 6-Step Multi-Crop Builder state
  const [scanDataUrl, setScanDataUrl] = useState<string>('');
  const [cropStepIdx, setCropStepIdx] = useState(0);
  const [cropRect, setCropRect] = useState({ x: 8, y: 12, w: 84, h: 24 });
  const [capturedCrops, setCapturedCrops] = useState<Record<string, string>>({});
  const [cropSubject, setCropSubject] = useState('Physics');
  const [cropChapter, setCropChapter] = useState('Electrostatics');
  const [cropDifficulty, setCropDifficulty] = useState<'Easy' | 'Moderate' | 'Tough'>('Moderate');
  const [cropQType, setCropQType] = useState<'single-mcq' | 'integer'>('single-mcq');
  const [cropCorrectIdx, setCropCorrectIdx] = useState<0 | 1 | 2 | 3>(0);
  const [cropNatAnswer, setCropNatAnswer] = useState('42');
  const [cropSavedMsg, setCropSavedMsg] = useState('');
  const imgElRef = useRef<HTMLImageElement | null>(null);

  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    for (const q of allBankQuestions) {
      if (q.chapterName && selectedSubjects.includes(q.subjectName)) {
        set.add(q.chapterName);
      }
    }
    return Array.from(set).slice(0, 24);
  }, [allBankQuestions, selectedSubjects]);

  const temperament = useMemo(
    () => analyzeExamTemperament(attempts, allBankQuestions, resolvedMistakeIds),
    [attempts, allBankQuestions, resolvedMistakeIds]
  );

  const handleLaunchPreset = () => {
    playClick();
    const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
    let pool = allBankQuestions.filter((q) => {
      if (selectedSubjects.length > 0 && !selectedSubjects.includes(q.subjectName)) return false;
      if (selectedChapters.length > 0 && q.chapterName && !selectedChapters.includes(q.chapterName)) {
        return false;
      }
      return true;
    });
    if (pool.length === 0) pool = allBankQuestions;

    // Build exact question count (for JEE Full 75: enforce 60 MCQ + 15 NAT = 80%/20%)
    const builtQuestions: TestQuestionRecord[] = [];
    const targetNatCount = preset.id === 'jee-full-75' ? 15 : 0;
    const mcqPool = pool.filter((q) => q.questionType !== 'integer');
    const natPool = pool.filter((q) => q.questionType === 'integer');
    const fallbackPool = pool.length > 0 ? pool : allBankQuestions;

    for (let i = 0; i < preset.count; i++) {
      const wantNat = targetNatCount > 0 && i >= preset.count - targetNatCount;
      const sourceArr = wantNat
        ? natPool.length > 0
          ? natPool
          : fallbackPool
        : mcqPool.length > 0
          ? mcqPool
          : fallbackPool;
      const base = sourceArr[i % sourceArr.length];
      if (!base) continue;
      builtQuestions.push({
        ...base,
        id: `custom-${preset.id}-q-${i + 1}-${base.id}`,
        testId: `custom-${preset.id}`,
        questionNumber: i + 1,
        questionType: wantNat ? 'integer' : base.questionType,
        numericalAnswer: wantNat ? base.numericalAnswer || '5' : base.numericalAnswer,
      });
    }

    const customTest: MockTestRecord = {
      id: `custom-${preset.id}-${Date.now()}`,
      title: `Custom ${preset.label} (${builtQuestions.length}Q · ${preset.examType})`,
      slug: `custom-${preset.id}`,
      destination: 'cbt-mock',
      cohortId: preset.examType === 'NEET UG' ? 'class-12-neet' : 'class-12-jee',
      examCategory: `${preset.examType} Custom NTA CBT`,
      examType: preset.examType,
      totalQuestions: builtQuestions.length,
      totalMarks: builtQuestions.length * 4,
      durationMinutes: preset.duration,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      showSolutionsAfterSubmit: true,
      status: 'published',
      instructions: getDefaultExamInstructions({
        examType: preset.examType,
        durationMinutes: preset.duration,
        positiveMarks: 4,
        negativeMarks: 1,
        negativeMarkingEnabled: true,
        totalQuestions: builtQuestions.length,
      }),
      createdAtIso: new Date().toISOString(),
    };

    onLaunchCustomTest(customTest, builtQuestions);
  };

  const handleLaunchSundayKiller = () => {
    playSuccess();
    const killerQs = buildSundayWeaknessKillerQuestions(temperament.sm2Queue, questions, 15);
    const killerTest: MockTestRecord = {
      id: `sunday-killer-${Date.now()}`,
      title: 'Sunday Weakness Killer Mock (SM-2 Spaced Repetition)',
      slug: 'sunday-weakness-killer',
      destination: 'cbt-mock',
      cohortId: 'class-12-jee',
      examCategory: 'SM-2 Weakness Killer CBT',
      examType: 'JEE Main',
      totalQuestions: killerQs.length,
      totalMarks: killerQs.length * 4,
      durationMinutes: 35,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      showSolutionsAfterSubmit: true,
      status: 'published',
      createdAtIso: new Date().toISOString(),
    };
    onLaunchCustomTest(killerTest, killerQs);
  };

  const captureCurrentCropStep = () => {
    const img = imgElRef.current;
    const stepKey = CROP_STEPS[cropStepIdx].key;
    if (img && img.naturalWidth > 0) {
      const canvas = document.createElement('canvas');
      const sx = (cropRect.x / 100) * img.naturalWidth;
      const sy = (cropRect.y / 100) * img.naturalHeight;
      const sw = Math.max(20, (cropRect.w / 100) * img.naturalWidth);
      const sh = Math.max(20, (cropRect.h / 100) * img.naturalHeight);
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const croppedUrl = canvas.toDataURL('image/png');
        setCapturedCrops((prev) => ({ ...prev, [stepKey]: croppedUrl }));
      }
    } else {
      setCapturedCrops((prev) => ({ ...prev, [stepKey]: 'captured-region' }));
    }
    playClick();
    if (cropStepIdx < CROP_STEPS.length - 1) {
      setCropStepIdx((i) => i + 1);
      setCropRect((r) => ({ ...r, y: Math.min(72, r.y + 12), h: 16 }));
    }
  };

  const handlePublishCroppedQuestion = () => {
    const newQ: TestQuestionRecord = {
      id: `crop-q-${Date.now()}`,
      testId: 'cbt-jee-full-mock-test-2',
      questionNumber: questions.length + 1,
      subjectName: cropSubject,
      chapterName: cropChapter,
      questionType: cropQType,
      questionText: `[Multi-Crop ${cropDifficulty}] ${cropSubject} — ${cropChapter} scanned question`,
      questionImageUrl: capturedCrops.question?.startsWith('data:') ? capturedCrops.question : undefined,
      optionTexts: cropQType === 'single-mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : [],
      optionImageUrls:
        cropQType === 'single-mcq'
          ? [
              capturedCrops.optA?.startsWith('data:') ? capturedCrops.optA : '',
              capturedCrops.optB?.startsWith('data:') ? capturedCrops.optB : '',
              capturedCrops.optC?.startsWith('data:') ? capturedCrops.optC : '',
              capturedCrops.optD?.startsWith('data:') ? capturedCrops.optD : '',
            ]
          : undefined,
      correctOptionIndices: cropQType === 'single-mcq' ? [cropCorrectIdx] : undefined,
      numericalAnswer: cropQType === 'integer' ? cropNatAnswer : undefined,
      solutionImageUrl: capturedCrops.explanation?.startsWith('data:')
        ? capturedCrops.explanation
        : undefined,
      solutionText: `Published via 6-Step Multi-Crop Builder (${cropSubject} · ${cropChapter} · ${cropDifficulty}).`,
      positiveMarks: 4,
      negativeMarks: 1,
      testStatus: 'published',
    };
    setCroppedBank((prev) => {
      const next = [newQ, ...prev].slice(0, 100);
      try {
        window.localStorage.setItem('prepskm2_cropped_questions_v1', JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
    playSuccess();
    setCropSavedMsg(
      `Published 6-step cropped ${cropSubject} question (${cropChapter}) — ${croppedBank.length + 1} custom question${croppedBank.length === 0 ? '' : 's'} ready in bank!`
    );
    setCropStepIdx(0);
    setCapturedCrops({});
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.08] pb-4">
        <div>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Prepskm 2.0 CBT Engine &amp; Exam-Temperament AI
          </p>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Custom Mock Builder, Tilt Diagnostics &amp; 6-Step Cropper
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08]">
          {[
            { id: 'generator', label: 'Custom Mock Generator', icon: Sliders },
            { id: 'temperament', label: 'Tilt & SM-2 AI', icon: Brain },
            { id: 'cropper', label: '6-Step Crop Builder', icon: Crop },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playClick();
                  setSubTab(tab.id as typeof subTab);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  subTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CUSTOM & FULL MOCK GENERATOR */}
      {subTab === 'generator' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  playClick();
                  setPresetId(p.id);
                  if (p.examType === 'NEET UG') {
                    setSelectedSubjects(['Physics', 'Chemistry', 'Biology']);
                  } else {
                    setSelectedSubjects(['Physics', 'Chemistry', 'Mathematics']);
                  }
                }}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  presetId === p.id
                    ? 'border-indigo-500 bg-indigo-500/10 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#09090B] text-slate-700 dark:text-zinc-300 hover:border-indigo-500/50'
                }`}
              >
                <p className="text-sm font-bold">{p.label}</p>
                <p className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  {p.detail}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              Subjects Included (Auto-switches to Authentic NTA Exam-Day Light Mode on launch):
            </p>
            <div className="flex flex-wrap gap-2">
              {['Physics', 'Chemistry', 'Mathematics', 'Biology'].map((sub) => {
                const active = selectedSubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() =>
                      setSelectedSubjects((prev) =>
                        prev.includes(sub)
                          ? prev.length > 1
                            ? prev.filter((s) => s !== sub)
                            : prev
                          : [...prev, sub]
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          {availableChapters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-zinc-300">
                  Optional Multi-Chapter Filter ({selectedChapters.length === 0 ? 'All Chapters' : `${selectedChapters.length} selected`})
                </span>
                {selectedChapters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedChapters([])}
                    className="text-indigo-500 hover:underline font-semibold"
                  >
                    Clear Chapters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 pb-1">
                {availableChapters.map((ch) => {
                  const active = selectedChapters.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() =>
                        setSelectedChapters((prev) =>
                          prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]
                        )
                      }
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#09090B] text-slate-600 dark:text-zinc-400 hover:border-indigo-500/50'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Authentic NTA interface: +4 / -1 marking, countdown timer, section switcher &amp; exam-day light mode.
            </p>
            <button
              type="button"
              onClick={handleLaunchPreset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              Launch Custom NTA CBT Mock
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: EXAM-TEMPERAMENT AI (TILT DETECTOR + TIME-SINK REPORT + SM-2 SUNDAY KILLER) */}
      {subTab === 'temperament' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] space-y-1">
              <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Negative-Marking Tilt Detector
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                -{temperament.totalMarksLostToTilt} marks
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {temperament.tiltIncidents.length} panic-guess incident(s) (&lt;15s after 2+ wrong/tough Qs) · Risk: {temperament.tiltRiskLevel}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] space-y-1">
              <p className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Time-Sink Trap Report (&gt;3.5 min)
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {temperament.timeSinkTraps.length} traps
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {Math.round(temperament.totalTimeLostSeconds / 60)}m spent on wrong/skipped ego traps
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] space-y-1">
              <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                SM-2 Spaced-Repetition Queue
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {temperament.sm2Queue.length} due
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Auto-scheduled Day 1 → Day 3 → Day 7 → Day 21
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{temperament.summaryHeadline}</span>
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
            <div className="text-xs text-slate-500 dark:text-zinc-400">
              Temperament Score:{' '}
              <strong className="font-mono text-slate-900 dark:text-white">
                {temperament.temperamentScore}/100
              </strong>
            </div>
            <button
              type="button"
              onClick={handleLaunchSundayKiller}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5" />
              Launch Sunday Weakness Killer Mock (15Q)
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: 6-STEP MULTI-CROP QUESTION BUILDER */}
      {subTab === 'cropper' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {CROP_STEPS.map((st, idx) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setCropStepIdx(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    cropStepIdx === idx
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : capturedCrops[st.key]
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-zinc-200 cursor-pointer hover:border-indigo-500">
              <Upload className="w-3.5 h-3.5" />
              Upload Paper Scan (Image)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setScanDataUrl(String(reader.result ?? ''));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] p-4 space-y-3">
              {scanDataUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-slate-300 dark:border-white/[0.1]">
                  <img
                    ref={imgElRef}
                    src={scanDataUrl}
                    alt="Uploaded exam scan"
                    referrerPolicy="no-referrer"
                    className="w-full max-h-64 object-contain"
                  />
                  <div
                    className="absolute border-2 border-indigo-500 bg-indigo-500/15 pointer-events-none"
                    style={{
                      left: `${cropRect.x}%`,
                      top: `${cropRect.y}%`,
                      width: `${cropRect.w}%`,
                      height: `${cropRect.h}%`,
                    }}
                  />
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-zinc-400">
                  Upload any exam question scan image above, adjust the crop frame sliders for{' '}
                  <strong>{CROP_STEPS[cropStepIdx].label}</strong>, and capture each step sequentially.
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <label className="space-y-1">
                  <span className="text-slate-500">Top ({cropRect.y}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={cropRect.y}
                    onChange={(e) => setCropRect((r) => ({ ...r, y: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Height ({cropRect.h}%)</span>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={cropRect.h}
                    onChange={(e) => setCropRect((r) => ({ ...r, h: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Left ({cropRect.x}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={cropRect.x}
                    onChange={(e) => setCropRect((r) => ({ ...r, x: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Width ({cropRect.w}%)</span>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={cropRect.w}
                    onChange={(e) => setCropRect((r) => ({ ...r, w: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={captureCurrentCropStep}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Capture {CROP_STEPS[cropStepIdx].label} &amp; Advance
              </button>
            </div>

            <div className="lg:col-span-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  aria-label="Subject"
                  value={cropSubject}
                  onChange={(e) => setCropSubject(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1]"
                >
                  {['Physics', 'Chemistry', 'Mathematics', 'Biology'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Difficulty"
                  value={cropDifficulty}
                  onChange={(e) => setCropDifficulty(e.target.value as typeof cropDifficulty)}
                  className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1]"
                >
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Tough">Tough</option>
                </select>
              </div>

              <input
                type="text"
                value={cropChapter}
                onChange={(e) => setCropChapter(e.target.value)}
                placeholder="Chapter name (e.g. Electrostatics)"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1]"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <select
                  aria-label="Question type"
                  value={cropQType}
                  onChange={(e) => setCropQType(e.target.value as typeof cropQType)}
                  className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1]"
                >
                  <option value="single-mcq">Single MCQ</option>
                  <option value="integer">Numerical (NAT)</option>
                </select>
                {cropQType === 'single-mcq' ? (
                  <select
                    aria-label="Correct option"
                    value={cropCorrectIdx}
                    onChange={(e) => setCropCorrectIdx(Number(e.target.value) as 0 | 1 | 2 | 3)}
                    className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1]"
                  >
                    <option value={0}>Answer: Option A</option>
                    <option value={1}>Answer: Option B</option>
                    <option value={2}>Answer: Option C</option>
                    <option value={3}>Answer: Option D</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={cropNatAnswer}
                    onChange={(e) => setCropNatAnswer(e.target.value)}
                    placeholder="NAT Value"
                    className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] font-mono"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={handlePublishCroppedQuestion}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Publish to Question Bank ({Object.keys(capturedCrops).length}/6 steps captured)
              </button>

              {cropSavedMsg && (
                <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {cropSavedMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
