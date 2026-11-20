import { useMemo, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Crop as CropIcon,
  FilePlus2,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  ExamType,
  MockTestRecord,
  QuestionType,
  StudentCohortId,
  SubjectRange,
  TestDestination,
  TestQuestionRecord,
  TestSyllabusItem,
} from '../../types';
import { usePlatformData } from '../../context/PlatformDataContext';
import {
  deleteMockTestAndQuestions,
  makeSafeDocId,
  saveMockTestWithQuestions,
  uploadPlatformFile,
} from '../../services/firestoreService';
import { getNextQuestionNumber, transitionQuestionType } from '../../utils/scoringEngine';
import { EXAM_TYPES, getDefaultExamInstructions } from '../../utils/examPresets';
import { ReusableButton } from '../ReusableButton';
import { ReusableCard } from '../ReusableCard';

type CropSlot = 'question' | 'opt0' | 'opt1' | 'opt2' | 'opt3' | 'solution';

const MCQ_SLOTS: { id: CropSlot; label: string }[] = [
  { id: 'question', label: '1. Question' },
  { id: 'opt0', label: '2. Option A' },
  { id: 'opt1', label: '3. Option B' },
  { id: 'opt2', label: '4. Option C' },
  { id: 'opt3', label: '5. Option D' },
  { id: 'solution', label: '6. Solution' },
];

const INTEGER_SLOTS: { id: CropSlot; label: string }[] = [
  { id: 'question', label: '1. Question' },
  { id: 'solution', label: '2. Solution' },
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

function createEmptyDraft(testId: string, qNumber: number, subjectName: string, pageNum: number): TestQuestionRecord {
  return {
    id: makeSafeDocId('q'),
    testId,
    questionNumber: qNumber,
    subjectName,
    chapterName: '',
    questionType: 'single-mcq',
    questionText: '',
    questionImageUrl: '',
    optionTexts: ['', '', '', ''],
    optionImageUrls: ['', '', '', ''],
    correctOptionIndices: [0],
    numericalAnswer: '',
    solutionText: '',
    solutionImageUrl: '',
    sourcePageNumber: pageNum,
    testStatus: 'draft',
  };
}

function resolveSubjectFromRanges(qNum: number, ranges: SubjectRange[], fallback: string): string {
  for (const r of ranges) {
    if (qNum >= r.startQ && qNum <= r.endQ) return r.subjectName;
  }
  return fallback;
}

async function extractCroppedBlob(
  image: HTMLImageElement,
  pixelCrop: PixelCrop
): Promise<{ blob: Blob; dataUrl: string }> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const rawW = Math.max(10, Math.round(pixelCrop.width * scaleX));
  const rawH = Math.max(10, Math.round(pixelCrop.height * scaleY));
  const maxWidth = 1080;
  const ratio = rawW > maxWidth ? maxWidth / rawW : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(rawW * ratio);
  canvas.height = Math.round(rawH * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    rawW,
    rawH,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode crop image'))),
      'image/jpeg',
      0.84
    );
  });

  return { blob, dataUrl };
}

export function QuestionPaperBuilder() {
  const { allCohorts, subjects, chapters, mockTests, questions: allPlatformQuestions } = usePlatformData();

  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testId, setTestId] = useState<string>(() => makeSafeDocId('test'));
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState<TestDestination>('cbt-mock');
  const [cohortId, setCohortId] = useState<StudentCohortId>('class-12-jee');
  const [examType, setExamType] = useState<ExamType>('JEE Main');
  const [examCategory, setExamCategory] = useState('JEE Main 2027');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [positiveMarks, setPositiveMarks] = useState(4);
  const [negativeMarks, setNegativeMarks] = useState(1);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(true);
  const [showSolutionsAfterSubmit, setShowSolutionsAfterSubmit] = useState(true);
  const [instructionsText, setInstructionsText] = useState<string>(() =>
    getDefaultExamInstructions({
      examType: 'JEE Main',
      durationMinutes: 180,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      totalQuestions: 75,
    }).join('\n')
  );
  const [syllabusRows, setSyllabusRows] = useState<{ subject: string; chaptersText: string }[]>([
    { subject: 'Physics', chaptersText: 'Electrostatics, Current Electricity, Kinematics' },
    { subject: 'Chemistry', chaptersText: 'Chemical Bonding, Thermodynamics' },
    { subject: 'Mathematics', chaptersText: 'Matrices & Determinants, Definite Integration' },
  ]);
  const [subjectRanges, setSubjectRanges] = useState<SubjectRange[]>([
    { subjectName: 'Physics', startQ: 1, endQ: 25 },
    { subjectName: 'Chemistry', startQ: 26, endQ: 50 },
    { subjectName: 'Mathematics', startQ: 51, endQ: 75 },
  ]);

  // Built questions list
  const [builtQuestions, setBuiltQuestions] = useState<TestQuestionRecord[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // Multi-page paper cropper state
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [pageImageSrc, setPageImageSrc] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [activeSlot, setActiveSlot] = useState<CropSlot>('question');
  const [croppingBusy, setCroppingBusy] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultSubName = useMemo(() => {
    if (destination === 'dpp') {
      return subjects.find((s) => s.id === selectedSubjectId)?.name ?? 'Physics';
    }
    return resolveSubjectFromRanges(1, subjectRanges, 'Physics');
  }, [destination, selectedSubjectId, subjectRanges, subjects]);

  const [draftQ, setDraftQ] = useState<TestQuestionRecord>(() =>
    createEmptyDraft(testId, 1, defaultSubName, 1)
  );

  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [savingTest, setSavingTest] = useState(false);

  const filteredChapters = useMemo(
    () => chapters.filter((c) => !selectedSubjectId || c.subjectId === selectedSubjectId),
    [chapters, selectedSubjectId]
  );

  const activeSlots = draftQ.questionType === 'integer' ? INTEGER_SLOTS : MCQ_SLOTS;

  const handleLoadExistingTest = (t: MockTestRecord) => {
    const linked = allPlatformQuestions
      .filter((q) => q.testId === t.id)
      .sort((a, b) => a.questionNumber - b.questionNumber);
    setEditingTestId(t.id);
    setTestId(t.id);
    setTitle(t.title);
    setDestination(t.destination);
    setCohortId(t.cohortId);
    const resolvedType: ExamType = t.examType ?? 'JEE Main';
    setExamType(resolvedType);
    setExamCategory(t.examCategory);
    setSelectedSubjectId(t.subjectId ?? subjects[0]?.id ?? '');
    setSelectedChapterId(t.chapterId ?? '');
    setDurationMinutes(t.durationMinutes);
    setPositiveMarks(t.positiveMarks);
    setNegativeMarks(t.negativeMarks);
    setNegativeMarkingEnabled(t.negativeMarkingEnabled);
    setShowSolutionsAfterSubmit(t.showSolutionsAfterSubmit);
    setInstructionsText(
      (t.instructions && t.instructions.length > 0
        ? t.instructions
        : getDefaultExamInstructions({
            examType: resolvedType,
            durationMinutes: t.durationMinutes,
            positiveMarks: t.positiveMarks,
            negativeMarks: t.negativeMarks,
            negativeMarkingEnabled: t.negativeMarkingEnabled,
            totalQuestions: linked.length || t.totalQuestions,
          })
      ).join('\n')
    );
    if (t.syllabus && t.syllabus.length > 0) {
      setSyllabusRows(
        t.syllabus.map((row) => ({
          subject: row.subject,
          chaptersText: row.chapters.join(', '),
        }))
      );
    }
    if (t.subjectRanges && t.subjectRanges.length > 0) {
      setSubjectRanges(t.subjectRanges);
    }
    setBuiltQuestions(linked);
    setEditingQuestionIndex(null);
    const nextNum = getNextQuestionNumber(linked);
    const nextSub =
      t.destination === 'dpp'
        ? subjects.find((s) => s.id === t.subjectId)?.name ?? 'Physics'
        : resolveSubjectFromRanges(nextNum, t.subjectRanges ?? subjectRanges, 'Physics');
    setDraftQ(createEmptyDraft(t.id, nextNum, nextSub, currentPageNumber));
    setStatusMessage({ type: 'ok', text: `Loaded "${t.title}" (${linked.length} questions) for editing.` });
  };

  const handleStartNewTest = () => {
    const freshId = makeSafeDocId('test');
    setEditingTestId(null);
    setTestId(freshId);
    setTitle('');
    setBuiltQuestions([]);
    setEditingQuestionIndex(null);
    setCurrentPageNumber(1);
    setPageImageSrc(null);
    setDraftQ(createEmptyDraft(freshId, 1, 'Physics', 1));
    setStatusMessage(null);
  };

  const handlePageImageUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'err', text: 'Please upload a PNG, JPG, or WebP question paper page image.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPageImageSrc(typeof reader.result === 'string' ? reader.result : null);
      setCrop(undefined);
      setCompletedCrop(null);
      setZoomPercent(100);
      setStatusMessage({
        type: 'ok',
        text: `Loaded Page ${currentPageNumber}. Continuing sequentially at Q${draftQ.questionNumber}.`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDoneWithPage = () => {
    const nextPage = currentPageNumber + 1;
    setCurrentPageNumber(nextPage);
    setPageImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setDraftQ((prev) => ({ ...prev, sourcePageNumber: nextPage }));
    fileInputRef.current?.click();
  };

  const handleQuestionTypeChange = (nextType: QuestionType) => {
    setDraftQ((prev) => {
      const transitioned = transitionQuestionType(prev, nextType);
      return {
        ...prev,
        ...transitioned,
        questionType: nextType,
      } as TestQuestionRecord;
    });
    if (nextType === 'integer' && activeSlot.startsWith('opt')) {
      setActiveSlot('solution');
    }
  };

  const handleApplyCrop = async () => {
    if (!imgRef.current || !completedCrop || completedCrop.width < 8 || completedCrop.height < 8) {
      setStatusMessage({
        type: 'err',
        text: 'Drag a rectangular selection on the question paper image first.',
      });
      return;
    }

    setCroppingBusy(true);
    setStatusMessage(null);

    try {
      const { blob, dataUrl } = await extractCroppedBlob(imgRef.current, completedCrop);
      let finalUrl = dataUrl;

      try {
        const file = new File([blob], `${testId}_q${draftQ.questionNumber}_${activeSlot}.jpg`, {
          type: 'image/jpeg',
        });
        const uploaded = await uploadPlatformFile({ folder: 'questions', file, kind: 'image' });
        finalUrl = uploaded.downloadUrl;
      } catch {
        // Keep compact JPEG dataUrl fallback
      }

      setDraftQ((prev) => {
        if (activeSlot === 'question') return { ...prev, questionImageUrl: finalUrl };
        if (activeSlot === 'solution') return { ...prev, solutionImageUrl: finalUrl };
        const optIdx = Number(activeSlot.replace('opt', ''));
        const nextImgs = [...(prev.optionImageUrls ?? ['', '', '', ''])];
        nextImgs[optIdx] = finalUrl;
        return { ...prev, optionImageUrls: nextImgs };
      });

      // Automatically advance to the next crop step in the guided workflow
      const slots = draftQ.questionType === 'integer' ? INTEGER_SLOTS : MCQ_SLOTS;
      const curSlotIdx = slots.findIndex((s) => s.id === activeSlot);
      if (curSlotIdx >= 0 && curSlotIdx < slots.length - 1) {
        setActiveSlot(slots[curSlotIdx + 1].id);
      }
      setCrop(undefined);
      setCompletedCrop(null);
    } catch (err) {
      setStatusMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to crop region.',
      });
    } finally {
      setCroppingBusy(false);
    }
  };

  const handleSaveQuestionAndNext = () => {
    if (!draftQ.questionText?.trim() && !draftQ.questionImageUrl?.trim()) {
      setStatusMessage({
        type: 'err',
        text: 'Add a cropped question image or enter question text before saving.',
      });
      return;
    }
    if (draftQ.questionType === 'integer' && !(draftQ.numericalAnswer ?? '').trim()) {
      setStatusMessage({
        type: 'err',
        text: 'Enter the exact numerical answer for this Integer question.',
      });
      return;
    }
    if (
      draftQ.questionType !== 'integer' &&
      (!draftQ.correctOptionIndices || draftQ.correctOptionIndices.length === 0)
    ) {
      setStatusMessage({
        type: 'err',
        text: 'Select at least one correct option (A–D) before saving.',
      });
      return;
    }

    const updatedList =
      editingQuestionIndex !== null
        ? builtQuestions.map((item, idx) => (idx === editingQuestionIndex ? draftQ : item))
        : [...builtQuestions, draftQ];

    setBuiltQuestions(updatedList);
    setEditingQuestionIndex(null);

    const nextNum = getNextQuestionNumber(updatedList);
    const nextSub =
      destination === 'dpp'
        ? subjects.find((s) => s.id === selectedSubjectId)?.name ?? draftQ.subjectName
        : resolveSubjectFromRanges(nextNum, subjectRanges, draftQ.subjectName);

    // Stay on the SAME page image so Admin can rapidly crop Q2, Q3, Q4...
    setDraftQ(createEmptyDraft(testId, nextNum, nextSub, currentPageNumber));
    setActiveSlot('question');
    setStatusMessage({
      type: 'ok',
      text: `Saved Q${draftQ.questionNumber}. Ready for Q${nextNum} on Page ${currentPageNumber}.`,
    });
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= builtQuestions.length) return;
    const copy = [...builtQuestions];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    const renumbered = copy.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    setBuiltQuestions(renumbered);
  };

  const handlePersistTest = async (status: 'draft' | 'published') => {
    if (!title.trim()) {
      setStatusMessage({ type: 'err', text: 'Enter a Test / DPP title first.' });
      return;
    }
    if (builtQuestions.length === 0) {
      setStatusMessage({ type: 'err', text: 'Add at least one question before saving or publishing.' });
      return;
    }

    setSavingTest(true);
    setStatusMessage(null);
    try {
      const parsedInstructions = instructionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const parsedSyllabus: TestSyllabusItem[] = syllabusRows
        .map((row) => ({
          subject: row.subject.trim(),
          chapters: row.chaptersText
            .split(',')
            .map((ch) => ch.trim())
            .filter(Boolean),
        }))
        .filter((row) => row.subject.length > 0 && row.chapters.length > 0);

      const testPayload: Omit<MockTestRecord, 'createdAt' | 'updatedAt' | 'createdAtIso'> = {
        id: testId,
        title: title.trim(),
        destination,
        cohortId,
        examCategory: examCategory.trim() || examType,
        examType,
        instructions: parsedInstructions.length > 0 ? parsedInstructions : undefined,
        syllabus: parsedSyllabus.length > 0 ? parsedSyllabus : undefined,
        subjectId: destination === 'dpp' ? selectedSubjectId || undefined : undefined,
        chapterId: destination === 'dpp' ? selectedChapterId || undefined : undefined,
        subjectRanges: destination === 'cbt-mock' ? subjectRanges : undefined,
        totalQuestions: builtQuestions.length,
        totalMarks: builtQuestions.reduce((sum, q) => sum + (q.positiveMarks ?? positiveMarks), 0),
        durationMinutes,
        positiveMarks,
        negativeMarks: negativeMarkingEnabled ? negativeMarks : 0,
        negativeMarkingEnabled,
        showSolutionsAfterSubmit,
        status,
      };

      const syncedQuestions = builtQuestions.map((q) => ({
        ...q,
        testId,
        testStatus: status,
      }));

      await saveMockTestWithQuestions(testPayload, syncedQuestions, Boolean(editingTestId));
      setEditingTestId(testId);
      setStatusMessage({
        type: 'ok',
        text:
          status === 'published'
            ? `Published "${testPayload.title}" with ${syncedQuestions.length} question(s)! Now live for students.`
            : `Saved "${testPayload.title}" as Draft (${syncedQuestions.length} question(s)).`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save test to Firestore.',
      });
    } finally {
      setSavingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Tests Switcher */}
      <ReusableCard padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display text-base font-bold text-[#0F214D] dark:text-white">
              CBT Mock Tests & Chapter DPPs ({mockTests.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Edit an existing paper or build a new test using the Multi-Page Visual Question Cropper.
            </p>
          </div>
          <ReusableButton variant="primary" size="sm" onClick={handleStartNewTest}>
            <FilePlus2 className="w-4 h-4" />
            New Test / DPP
          </ReusableButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {mockTests.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {t.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.destination === 'cbt-mock' ? 'CBT Mock' : 'DPP'} · {t.status.toUpperCase()} ·{' '}
                  {t.totalQuestions} Qs
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLoadExistingTest(t)}
                  aria-label={`Edit ${t.title}`}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteMockTestAndQuestions(t.id)}
                  aria-label={`Delete ${t.title}`}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ReusableCard>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center gap-2 ${
            statusMessage.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Step 1: Test Configuration */}
      <ReusableCard className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#E86F0C]" />
          <h3 className="font-display text-base font-bold text-[#0F214D] dark:text-white">
            1. Test Configuration
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="builder-title" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Test / DPP Title
            </label>
            <input
              id="builder-title"
              type="text"
              placeholder="e.g. JEE Main 2027 Full-Syllabus CBT Mock #02"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label htmlFor="builder-dest" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Destination Mode
            </label>
            <select
              id="builder-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value as TestDestination)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="cbt-mock">CBT Mock Test (/cbt-mocks)</option>
              <option value="dpp">Chapter-Wise DPP (/dpp)</option>
            </select>
          </div>

          <div>
            <label htmlFor="builder-cohort" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Target Class / Sub-Class
            </label>
            <select
              id="builder-cohort"
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value as StudentCohortId)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {allCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="builder-exam-type" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Exam Pattern (Auto-Fills Instructions)
            </label>
            <select
              id="builder-exam-type"
              value={examType}
              onChange={(e) => {
                const nextType = e.target.value as ExamType;
                setExamType(nextType);
                setExamCategory(nextType);
                setInstructionsText(
                  getDefaultExamInstructions({
                    examType: nextType,
                    durationMinutes,
                    positiveMarks,
                    negativeMarks,
                    negativeMarkingEnabled,
                    totalQuestions: builtQuestions.length || 30,
                  }).join('\n')
                );
              }}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {EXAM_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="builder-cat" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Exam Label / Series
            </label>
            <input
              id="builder-cat"
              type="text"
              value={examCategory}
              onChange={(e) => setExamCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label htmlFor="builder-dur" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Duration (Minutes)
            </label>
            <input
              id="builder-dur"
              type="number"
              min={5}
              max={360}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
            />
          </div>

          {destination === 'dpp' && (
            <>
              <div>
                <label htmlFor="builder-subj" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  DPP Subject
                </label>
                <select
                  id="builder-subj"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="builder-chap" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  DPP Chapter
                </label>
                <select
                  id="builder-chap"
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="">All / General Chapter</option>
                  {filteredChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="builder-pos" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                + Marks
              </label>
              <input
                id="builder-pos"
                type="number"
                step="0.5"
                value={positiveMarks}
                onChange={(e) => setPositiveMarks(Number(e.target.value) || 4)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="builder-neg" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                − Marks
              </label>
              <input
                id="builder-neg"
                type="number"
                step="0.25"
                disabled={!negativeMarkingEnabled}
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={negativeMarkingEnabled}
              onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Enable Negative Marking</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSolutionsAfterSubmit}
              onChange={(e) => setShowSolutionsAfterSubmit(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Show Solutions After Submission</span>
          </label>
        </div>

        {/* CBT Subject Ranges */}
        {destination === 'cbt-mock' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Subject Question Ranges (Auto-maps subject by Q#)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {subjectRanges.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  <input
                    type="text"
                    aria-label={`Range ${idx + 1} subject name`}
                    value={r.subjectName}
                    onChange={(e) =>
                      setSubjectRanges((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, subjectName: e.target.value } : item
                        )
                      )
                    }
                    className="w-full min-w-0 text-xs font-semibold bg-transparent focus:outline-none"
                  />
                  <input
                    type="number"
                    aria-label={`${r.subjectName} start question`}
                    value={r.startQ}
                    onChange={(e) =>
                      setSubjectRanges((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, startQ: Number(e.target.value) || 1 } : item
                        )
                      )
                    }
                    className="w-14 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <span className="text-xs text-slate-400">–</span>
                  <input
                    type="number"
                    aria-label={`${r.subjectName} end question`}
                    value={r.endQ}
                    onChange={(e) =>
                      setSubjectRanges((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, endQ: Number(e.target.value) || 1 } : item
                        )
                      )
                    }
                    className="w-14 px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exam-Specific Instructions & Test Syllabus Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="builder-instructions" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Exam-Specific Instructions ({examType}, one per line)
              </label>
              <button
                type="button"
                onClick={() =>
                  setInstructionsText(
                    getDefaultExamInstructions({
                      examType,
                      durationMinutes,
                      positiveMarks,
                      negativeMarks,
                      negativeMarkingEnabled,
                      totalQuestions: builtQuestions.length || 30,
                    }).join('\n')
                  )
                }
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Reset to {examType} Preset
              </button>
            </div>
            <textarea
              id="builder-instructions"
              rows={5}
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Test Syllabus (Visible in "View Syllabus" Modal)
              </p>
              <button
                type="button"
                onClick={() =>
                  setSyllabusRows((prev) => [...prev, { subject: '', chaptersText: '' }])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subject
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {syllabusRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Subject"
                    value={row.subject}
                    onChange={(e) =>
                      setSyllabusRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, subject: e.target.value } : r))
                      )
                    }
                    className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Chapters (comma-separated)"
                    value={row.chaptersText}
                    onChange={(e) =>
                      setSyllabusRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, chaptersText: e.target.value } : r))
                      )
                    }
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    aria-label="Remove syllabus subject"
                    onClick={() =>
                      setSyllabusRows((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ReusableCard>

      {/* Step 2: Multi-Page Visual Question Paper Cropper */}
      <ReusableCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#0F214D] dark:text-white flex items-center gap-2">
              <CropIcon className="w-5 h-5 text-[#E86F0C]" />
              2. Multi-Page Visual Question Cropper — Page {currentPageNumber} · Q
              {draftQ.questionNumber}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload a question paper page, crop Question/Options/Solution, or type text directly. Question numbering continues sequentially across pages.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePageImageUpload(e.target.files?.[0])}
            />
            <ReusableButton
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-4 h-4" />
              {pageImageSrc ? `Replace Page ${currentPageNumber}` : `Upload Page ${currentPageNumber}`}
            </ReusableButton>
            {pageImageSrc && (
              <ReusableButton variant="primary" size="sm" onClick={handleDoneWithPage}>
                Done with Page {currentPageNumber} → Next Page
              </ReusableButton>
            )}
          </div>
        </div>

        {/* Question Metadata Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="draft-qnum" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Question #
            </label>
            <input
              id="draft-qnum"
              type="number"
              min={1}
              value={draftQ.questionNumber}
              onChange={(e) => {
                const n = Math.max(1, Number(e.target.value) || 1);
                setDraftQ((prev) => ({
                  ...prev,
                  questionNumber: n,
                  subjectName:
                    destination === 'cbt-mock'
                      ? resolveSubjectFromRanges(n, subjectRanges, prev.subjectName)
                      : prev.subjectName,
                }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
            />
          </div>

          <div>
            <label htmlFor="draft-qtype" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Question Type
            </label>
            <select
              id="draft-qtype"
              value={draftQ.questionType}
              onChange={(e) => handleQuestionTypeChange(e.target.value as QuestionType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="single-mcq">Single Choice MCQ (6 crops)</option>
              <option value="multi-mcq">Multiple Choice MCQ (6 crops)</option>
              <option value="integer">Integer / Numerical (2 crops)</option>
            </select>
          </div>

          <div>
            <label htmlFor="draft-subj" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Subject
            </label>
            <input
              id="draft-subj"
              type="text"
              value={draftQ.subjectName}
              onChange={(e) => setDraftQ((prev) => ({ ...prev, subjectName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label htmlFor="draft-chap" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Chapter Tag
            </label>
            <input
              id="draft-chap"
              type="text"
              placeholder="e.g. Electrostatics"
              value={draftQ.chapterName ?? ''}
              onChange={(e) => setDraftQ((prev) => ({ ...prev, chapterName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        </div>

        {/* Guided Crop Slot Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSlots.map((slot) => {
            const hasImg =
              slot.id === 'question'
                ? Boolean(draftQ.questionImageUrl)
                : slot.id === 'solution'
                  ? Boolean(draftQ.solutionImageUrl)
                  : Boolean(draftQ.optionImageUrls?.[Number(slot.id.replace('opt', ''))]);
            const isSelected = activeSlot === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveSlot(slot.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isSelected
                    ? 'bg-[#0F214D] text-white border-[#0F214D] dark:bg-sky-500 dark:text-slate-950'
                    : hasImg
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {slot.label} {hasImg ? '✓' : ''}
              </button>
            );
          })}
        </div>

        {/* Interactive Image Cropper Workspace */}
        {pageImageSrc ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => setZoomPercent((z) => Math.max(50, z - 25))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs font-semibold w-12 text-center tabular-nums">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => setZoomPercent((z) => Math.min(250, z + 25))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <ReusableButton
                variant="accent"
                size="sm"
                disabled={croppingBusy || !completedCrop}
                onClick={() => void handleApplyCrop()}
              >
                <CropIcon className="w-4 h-4" />
                {croppingBusy
                  ? 'Cropping...'
                  : `Capture Crop → ${activeSlots.find((s) => s.id === activeSlot)?.label}`}
              </ReusableButton>
            </div>

            <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-3">
              <div style={{ width: `${zoomPercent}%`, minWidth: '100%' }}>
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                >
                  <img
                    ref={imgRef}
                    src={pageImageSrc}
                    alt={`Question Paper Page ${currentPageNumber}`}
                    className="max-w-none w-full h-auto block"
                  />
                </ReactCrop>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Upload a scanned question paper image (PNG/JPG) to visually crop Question, Options A–D, and Solution — or enter question text below.
            </p>
          </div>
        )}

        {/* Text & Preview Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          <div className="space-y-3">
            <div>
              <label htmlFor="draft-qtext" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Question Text (Optional if cropped)
              </label>
              <textarea
                id="draft-qtext"
                rows={3}
                value={draftQ.questionText ?? ''}
                onChange={(e) => setDraftQ((prev) => ({ ...prev, questionText: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>

            {draftQ.questionImageUrl && (
              <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Question Crop Preview</p>
                <img src={draftQ.questionImageUrl} alt="Question crop preview" className="max-h-32 object-contain" />
              </div>
            )}

            <div>
              <label htmlFor="draft-soltext" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Solution Explanation (Optional if cropped)
              </label>
              <textarea
                id="draft-soltext"
                rows={2}
                value={draftQ.solutionText ?? ''}
                onChange={(e) => setDraftQ((prev) => ({ ...prev, solutionText: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>

            {draftQ.solutionImageUrl && (
              <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Solution Crop Preview</p>
                <img src={draftQ.solutionImageUrl} alt="Solution crop preview" className="max-h-28 object-contain" />
              </div>
            )}
          </div>

          {/* Options / Numerical Answer Column */}
          <div className="space-y-3">
            {draftQ.questionType === 'integer' ? (
              <div>
                <label htmlFor="draft-numans" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Correct Numerical / Integer Answer
                </label>
                <input
                  id="draft-numans"
                  type="text"
                  placeholder="e.g. 24 or 9.8"
                  value={draftQ.numericalAnswer ?? ''}
                  onChange={(e) =>
                    setDraftQ((prev) => ({ ...prev, numericalAnswer: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-base font-bold"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Options A–D are automatically omitted for Integer questions.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Options A–D & Correct Key ({draftQ.questionType === 'single-mcq' ? 'Select 1' : 'Select all correct'})
                </p>
                {OPTION_LETTERS.map((letter, idx) => {
                  const isCorrect = (draftQ.correctOptionIndices ?? []).includes(idx);
                  const optImg = draftQ.optionImageUrls?.[idx];
                  return (
                    <div
                      key={letter}
                      className="flex items-start gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setDraftQ((prev) => {
                            const curr = prev.correctOptionIndices ?? [];
                            if (prev.questionType === 'single-mcq') {
                              return { ...prev, correctOptionIndices: [idx] };
                            }
                            const next = curr.includes(idx)
                              ? curr.filter((i) => i !== idx)
                              : [...curr, idx].sort((a, b) => a - b);
                            return { ...prev, correctOptionIndices: next };
                          })
                        }
                        aria-label={`Mark option ${letter} as correct`}
                        className={`w-8 h-8 rounded-lg font-mono text-xs font-bold shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {letter}
                      </button>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          placeholder={`Option ${letter} text (optional if cropped)`}
                          value={draftQ.optionTexts?.[idx] ?? ''}
                          onChange={(e) =>
                            setDraftQ((prev) => {
                              const next = [...(prev.optionTexts ?? ['', '', '', ''])];
                              next[idx] = e.target.value;
                              return { ...prev, optionTexts: next };
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                        {optImg && (
                          <img src={optImg} alt={`Option ${letter} preview`} className="max-h-14 rounded bg-white" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <ReusableButton variant="primary" size="sm" onClick={handleSaveQuestionAndNext}>
            <Save className="w-4 h-4" />
            {editingQuestionIndex !== null ? 'Update Question' : 'Save Question & Next on Same Page'}
          </ReusableButton>
        </div>
      </ReusableCard>

      {/* Step 3: Question Queue & Publish Controls */}
      <ReusableCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#0F214D] dark:text-white">
              3. Question Queue ({builtQuestions.length} Question{builtQuestions.length === 1 ? '' : 's'})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preview, reorder, edit, save as Draft, or Publish live to students.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReusableButton
              variant="secondary"
              size="sm"
              disabled={savingTest}
              onClick={() => void handlePersistTest('draft')}
            >
              <Save className="w-4 h-4" />
              Save Draft
            </ReusableButton>
            <ReusableButton
              variant="accent"
              size="sm"
              disabled={savingTest}
              onClick={() => void handlePersistTest('published')}
            >
              <Send className="w-4 h-4" />
              {savingTest ? 'Publishing...' : 'Publish Live'}
            </ReusableButton>
          </div>
        </div>

        {builtQuestions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            No questions added yet. Crop or type Question 1 above and click "Save Question & Next".
          </p>
        ) : (
          <div className="space-y-2">
            {builtQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono text-sm font-bold text-[#0F214D] dark:text-sky-300 shrink-0">
                    Q{q.questionNumber}
                  </span>
                  {q.questionImageUrl && (
                    <img
                      src={q.questionImageUrl}
                      alt={`Q${q.questionNumber}`}
                      className="h-10 w-16 object-cover rounded border border-slate-200 bg-white shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {q.questionText || `Cropped Image Question (Page ${q.sourcePageNumber ?? 1})`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {q.subjectName} · {q.questionType} · Key:{' '}
                      {q.questionType === 'integer'
                        ? q.numericalAnswer
                        : (q.correctOptionIndices ?? []).map((i) => OPTION_LETTERS[i]).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`Move Q${q.questionNumber} up`}
                    disabled={idx === 0}
                    onClick={() => handleMoveQuestion(idx, -1)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move Q${q.questionNumber} down`}
                    disabled={idx === builtQuestions.length - 1}
                    onClick={() => handleMoveQuestion(idx, 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit Q${q.questionNumber}`}
                    onClick={() => {
                      setDraftQ(q);
                      setEditingQuestionIndex(idx);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete Q${q.questionNumber}`}
                    onClick={() =>
                      setBuiltQuestions((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ReusableCard>
    </div>
  );
}
