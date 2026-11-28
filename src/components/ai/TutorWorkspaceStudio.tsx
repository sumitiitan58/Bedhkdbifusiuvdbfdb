import { useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  StickyNote,
  Trash2,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ReusableCard } from '../ReusableCard';
import { ReusableButton } from '../ReusableButton';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeProvider';
import {
  appendTutorRowsToGoogleSheet,
  connectGoogleWorkspace,
  listStudentGoogleSheets,
  readGoogleSheetTab,
  subscribeWorkspaceAuth,
  type GoogleDriveSheetSummary,
} from '../../services/googleWorkspaceService';
import {
  requestTutorLearningPath,
  requestTutorPracticeQuestions,
  requestTutorSheetFeedback,
} from '../../services/geminiClient';
import {
  SAMPLE_STUDENT_SHEET,
  analyzeStudentSheetRows,
  buildKeepLearningPathNote,
  buildKeepPracticeMistakesNote,
  buildKeepSheetFeedbackNote,
  type KeepStudyNote,
  type SheetPerformanceAnalysis,
  type TutorLearningPath,
  type TutorPracticeQuestion,
  type TutorSheetFeedback,
} from '../../utils/sheetTutorAnalyzer';
import {
  renderOptionImageDataUrl,
  renderQuestionImageDataUrl,
} from '../../utils/questionImageRenderer';
import { cleanTextForSpeech } from '../../utils/speechUtils';
import { speakText, stopSpeaking } from '../../utils/speakText';
import { playAiSparkle, playClick, playSuccess } from '../../utils/soundEffects';

export type TutorStudioMode = 'chat' | 'sheets' | 'learning-path' | 'practice';

interface TutorWorkspaceStudioProps {
  activeTab: Exclude<TutorStudioMode, 'chat'>;
  studentName: string;
  cohortLabel: string;
  sheetAnalysis: SheetPerformanceAnalysis | null;
  onSheetAnalysisChange: (analysis: SheetPerformanceAnalysis | null) => void;
  keepNotes: KeepStudyNote[];
  onAddKeepNote: (note: Omit<KeepStudyNote, 'id' | 'updatedAtIso'>) => void;
  onDeleteKeepNote: (id: string) => void;
  onOpenChatWithPrompt: (prompt: string) => void;
}

type PendingSheetWrite =
  | {
      kind: 'feedback';
      spreadsheetId: string;
      sheetTitle: string;
      tabName: string;
      rows: Array<Array<string | number>>;
    }
  | {
      kind: 'quiz';
      spreadsheetId: string;
      sheetTitle: string;
      tabName: string;
      rows: Array<Array<string | number>>;
    }
  | null;

const SUBJECT_OPTIONS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];

export function TutorWorkspaceStudio({
  activeTab,
  studentName,
  cohortLabel,
  sheetAnalysis,
  onSheetAnalysisChange,
  keepNotes,
  onAddKeepNote,
  onDeleteKeepNote,
  onOpenChatWithPrompt,
}: TutorWorkspaceStudioProps) {
  const { isGuest } = useAuth();
  const imageTheme = useContext(ThemeContext)?.theme === 'dark' ? 'dark' : 'light';
  const [practiceImageMode, setPracticeImageMode] = useState(true);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [workspaceConnected, setWorkspaceConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Live Google Sheets browser state
  const [driveSheets, setDriveSheets] = useState<GoogleDriveSheetSummary[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedTabName, setSelectedTabName] = useState<string>('');
  const [isSampleSheet, setIsSampleSheet] = useState(false);
  const [sheetError, setSheetError] = useState('');

  // AI Sheet Feedback state
  const [aiFeedback, setAiFeedback] = useState<TutorSheetFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Learning Path state
  const [lpSubject, setLpSubject] = useState('Physics');
  const [lpChapter, setLpChapter] = useState('Electrostatics');
  const [lpLoading, setLpLoading] = useState(false);
  const [lpError, setLpError] = useState('');
  const [learningPath, setLearningPath] = useState<TutorLearningPath | null>(null);

  // Practice Quiz state
  const [pqSubject, setPqSubject] = useState('Physics');
  const [pqChapter, setPqChapter] = useState('Electrostatics');
  const [pqDifficulty, setPqDifficulty] = useState<'Foundation' | 'Exam Level' | 'Challenge'>(
    'Exam Level'
  );
  const [pqCount, setPqCount] = useState<number>(3);
  const [pqLoading, setPqLoading] = useState(false);
  const [pqError, setPqError] = useState('');
  const [practiceQuestions, setPracticeQuestions] = useState<TutorPracticeQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizChecked, setQuizChecked] = useState(false);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  // Keep Notes inline form state
  const [keepFormOpen, setKeepFormOpen] = useState(false);
  const [keepTitle, setKeepTitle] = useState('');
  const [keepSubject, setKeepSubject] = useState('Physics');
  const [keepChapter, setKeepChapter] = useState('');
  const [keepContent, setKeepContent] = useState('');

  // Confirmation modal & status toast
  const [pendingWrite, setPendingWrite] = useState<PendingSheetWrite>(null);
  const [writingSheet, setWritingSheet] = useState(false);
  const [banner, setBanner] = useState<{
    kind: 'success' | 'error' | 'info';
    text: string;
    linkUrl?: string;
    linkLabel?: string;
  } | null>(null);

  useEffect(() => {
    return subscribeWorkspaceAuth(setWorkspaceConnected);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const toggleSpeakText = (key: string, rawText: string) => {
    playClick();
    if (speakingKey === key) {
      stopSpeaking();
      setSpeakingKey(null);
      return;
    }
    const cleaned = cleanTextForSpeech(rawText);
    if (!cleaned) return;
    setSpeakingKey(key);
    void speakText(cleaned, {
      language: 'hinglish',
      onStart: () => setSpeakingKey(key),
      onEnd: () => setSpeakingKey((curr) => (curr === key ? null : curr)),
      onError: () => setSpeakingKey((curr) => (curr === key ? null : curr)),
    });
  };

  const weakChapterSuggestions = useMemo(
    () => (sheetAnalysis?.weakChapters ?? []).slice(0, 4),
    [sheetAnalysis]
  );

  const handleSignInAndFetchSheets = async () => {
    playClick();
    setConnecting(true);
    setSheetError('');
    setBanner(null);
    try {
      await connectGoogleWorkspace();
      playSuccess();
      const files = await listStudentGoogleSheets();
      setDriveSheets(files);
      setBanner({
        kind: 'success',
        text:
          files.length > 0
            ? `Google SSO active. Found ${files.length} spreadsheet${files.length === 1 ? '' : 's'} in your Google Drive.`
            : 'Google SSO active. No spreadsheets found yet — export your Prep Score from Analytics or load the sample tracker below.',
      });
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshDriveSheets = async () => {
    playClick();
    setSheetsLoading(true);
    setSheetError('');
    try {
      const files = await listStudentGoogleSheets();
      setDriveSheets(files);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'Could not list your Google Sheets.');
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleLoadLiveSheet = async (spreadsheetId: string, tabName?: string) => {
    if (!spreadsheetId) return;
    playClick();
    setSheetsLoading(true);
    setSheetError('');
    setAiFeedback(null);
    try {
      const tabData = await readGoogleSheetTab(spreadsheetId, tabName);
      setSelectedSheetId(tabData.spreadsheetId);
      setAvailableTabs(tabData.availableTabs);
      setSelectedTabName(tabData.tabName);
      setIsSampleSheet(false);

      const analysis = analyzeStudentSheetRows(
        tabData.headers,
        tabData.rows,
        tabData.title,
        tabData.tabName
      );
      onSheetAnalysisChange(analysis);
      if (analysis.weakChapters[0]) {
        setLpSubject(analysis.weakChapters[0].subject);
        setLpChapter(analysis.weakChapters[0].chapter);
        setPqSubject(analysis.weakChapters[0].subject);
        setPqChapter(analysis.weakChapters[0].chapter);
      }
      playSuccess();
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'Could not read spreadsheet.');
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleLoadSampleSheet = () => {
    playClick();
    setSheetError('');
    setAiFeedback(null);
    setSelectedSheetId(SAMPLE_STUDENT_SHEET.spreadsheetId);
    setAvailableTabs([SAMPLE_STUDENT_SHEET.tabName]);
    setSelectedTabName(SAMPLE_STUDENT_SHEET.tabName);
    setIsSampleSheet(true);

    const analysis = analyzeStudentSheetRows(
      SAMPLE_STUDENT_SHEET.headers,
      SAMPLE_STUDENT_SHEET.rows,
      SAMPLE_STUDENT_SHEET.title,
      SAMPLE_STUDENT_SHEET.tabName
    );
    onSheetAnalysisChange(analysis);
    if (analysis.weakChapters[0]) {
      setLpSubject(analysis.weakChapters[0].subject);
      setLpChapter(analysis.weakChapters[0].chapter);
      setPqSubject(analysis.weakChapters[0].subject);
      setPqChapter(analysis.weakChapters[0].chapter);
    }
    playSuccess();
  };

  const handleGenerateAiSheetFeedback = async () => {
    if (!sheetAnalysis) return;
    playClick();
    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      const { feedback } = await requestTutorSheetFeedback({
        studentName,
        cohortLabel,
        sheetAnalysis,
        keepNotes,
      });
      setAiFeedback(feedback);
      playAiSparkle();
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : 'Could not generate AI mentor feedback right now.'
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleBuildLearningPath = async () => {
    const cleanChapter = lpChapter.trim();
    if (!cleanChapter) {
      setLpError('Enter a chapter or topic name to generate your personalized learning path.');
      return;
    }
    playClick();
    setLpLoading(true);
    setLpError('');

    const matchedSheetChapter = sheetAnalysis?.weakChapters.find(
      (c) => c.chapter.toLowerCase() === cleanChapter.toLowerCase()
    );
    const matchedNotes = sheetAnalysis?.records
      .filter((r) => r.chapter.toLowerCase() === cleanChapter.toLowerCase() && r.notes)
      .map((r) => r.notes)
      .join('; ');
    const matchingKeep = keepNotes.filter(
      (n) =>
        n.chapter.toLowerCase().includes(cleanChapter.toLowerCase()) ||
        n.subject.toLowerCase() === lpSubject.toLowerCase()
    );

    try {
      const { learningPath: generated } = await requestTutorLearningPath({
        studentName,
        cohortLabel,
        subjectName: lpSubject,
        chapterName: cleanChapter,
        currentAccuracy: matchedSheetChapter?.averageAccuracyPercent ?? null,
        sheetNotes: matchedNotes || '',
        keepNotes: matchingKeep.length > 0 ? matchingKeep : keepNotes.slice(0, 3),
      });
      setLearningPath(generated);
      playAiSparkle();
    } catch (err) {
      setLpError(
        err instanceof Error ? err.message : 'Could not build chapter learning path right now.'
      );
    } finally {
      setLpLoading(false);
    }
  };

  const handleGeneratePracticeQuiz = async () => {
    const cleanChapter = pqChapter.trim();
    if (!cleanChapter) {
      setPqError('Enter a chapter name to generate relevant practice questions.');
      return;
    }
    playClick();
    setPqLoading(true);
    setPqError('');
    setQuizChecked(false);
    setSelectedAnswers({});
    setRevealedHints({});

    const relatedKeep = keepNotes
      .filter(
        (n) =>
          n.chapter.toLowerCase().includes(cleanChapter.toLowerCase()) ||
          n.subject.toLowerCase() === pqSubject.toLowerCase()
      )
      .map((n) => `${n.title}: ${n.content}`)
      .join(' | ');
    const relatedSheetNotes = sheetAnalysis?.records
      .filter((r) => r.chapter.toLowerCase() === cleanChapter.toLowerCase() && r.notes)
      .map((r) => r.notes)
      .join('; ');

    try {
      const { questions } = await requestTutorPracticeQuestions({
        cohortLabel,
        subjectName: pqSubject,
        chapterName: cleanChapter,
        difficulty: pqDifficulty,
        count: pqCount,
        focusNote: [relatedSheetNotes, relatedKeep].filter(Boolean).join(' — '),
      });
      setPracticeQuestions(questions);
      playAiSparkle();
    } catch (err) {
      setPqError(
        err instanceof Error ? err.message : 'Could not generate practice questions right now.'
      );
    } finally {
      setPqLoading(false);
    }
  };

  const handleCopyForKeep = async (text: string, label: string) => {
    playClick();
    try {
      await navigator.clipboard.writeText(text);
      playSuccess();
      setBanner({
        kind: 'info',
        text: `${label} copied for Google Keep. Paste straight into a new Keep note.`,
        linkUrl: 'https://keep.google.com/',
        linkLabel: 'Open Google Keep',
      });
    } catch {
      setBanner({
        kind: 'info',
        text: 'Clipboard access blocked. Open Google Keep directly to save your revision checklist.',
        linkUrl: 'https://keep.google.com/',
        linkLabel: 'Open Google Keep',
      });
    }
  };

  const executeConfirmedSheetWrite = async () => {
    if (!pendingWrite) return;
    const action = pendingWrite;
    setPendingWrite(null);
    setWritingSheet(true);
    setBanner(null);

    try {
      const res = await appendTutorRowsToGoogleSheet({
        spreadsheetId: action.spreadsheetId,
        tabName: action.tabName,
        rows: action.rows,
      });
      playSuccess();
      setBanner({
        kind: 'success',
        text: `Appended ${res.updatedRows} row${res.updatedRows === 1 ? '' : 's'} to "${action.sheetTitle}" (${res.updatedRange}).`,
        linkUrl: `https://docs.google.com/spreadsheets/d/${action.spreadsheetId}`,
        linkLabel: 'Open Google Sheet',
      });
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to append row to Google Sheet.',
      });
    } finally {
      setWritingSheet(false);
    }
  };

  const quizScore = useMemo(() => {
    if (!quizChecked || practiceQuestions.length === 0) return null;
    let correct = 0;
    for (const q of practiceQuestions) {
      if (selectedAnswers[q.id] === q.correctIndex) correct += 1;
    }
    return {
      correct,
      total: practiceQuestions.length,
      percent: Math.round((correct / practiceQuestions.length) * 100),
    };
  }, [practiceQuestions, quizChecked, selectedAnswers]);

  return (
    <div className="space-y-4">
      {/* Shared Status Banner */}
      {banner && (
        <div
          role="status"
          className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl text-xs border ${
            banner.kind === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : banner.kind === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}
        >
          <span>{banner.text}</span>
          {banner.linkUrl && (
            <a
              href={banner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold underline shrink-0"
            >
              {banner.linkLabel || 'Open'}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* TAB: GOOGLE SHEETS PERFORMANCE ANALYZER */}
      {activeTab === 'sheets' && (
        <div className="space-y-4">
          <ReusableCard padding="md" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Google Sheets Student Performance Analyzer
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Connect your Google Drive spreadsheet to track progress, spot weak chapters, and
                  receive data-grounded mentor feedback — or explore instantly with a sample sheet.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!workspaceConnected ? (
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => void handleSignInAndFetchSheets()}
                    className="inline-flex items-center gap-2.5 h-10 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[#1F1F1F] dark:text-slate-100 text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {connecting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                    )}
                    <span>{!isGuest ? 'Refresh Google SSO' : 'Sign in with Google'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={sheetsLoading}
                    onClick={() => void handleRefreshDriveSheets()}
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sheetsLoading ? 'animate-spin' : ''}`} />
                    Load My Google Sheets
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLoadSampleSheet}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0B1B3B] dark:text-slate-100 hover:border-[#2563EB] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-[#2563EB]" />
                  Load Sample Student Sheet
                </button>
              </div>
            </div>

            {/* Live Spreadsheet & Tab Pickers */}
            {workspaceConnected && driveSheets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label
                    htmlFor="drive-sheet-select"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                  >
                    Select Google Spreadsheet
                  </label>
                  <select
                    id="drive-sheet-select"
                    value={isSampleSheet ? '' : selectedSheetId}
                    onChange={(e) => void handleLoadLiveSheet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  >
                    <option value="">Choose a spreadsheet from Drive...</option>
                    {driveSheets.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {availableTabs.length > 0 && !isSampleSheet && (
                  <div>
                    <label
                      htmlFor="sheet-tab-select"
                      className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                    >
                      Select Sheet Tab
                    </label>
                    <select
                      id="sheet-tab-select"
                      value={selectedTabName}
                      onChange={(e) => void handleLoadLiveSheet(selectedSheetId, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    >
                      {availableTabs.map((tab) => (
                        <option key={tab} value={tab}>
                          {tab}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {sheetError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {sheetError}
              </div>
            )}
          </ReusableCard>

          {/* Parsed Sheet Quantitative Dashboard */}
          {sheetAnalysis ? (
            <ReusableCard padding="md" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {isSampleSheet ? 'Sample Data Sheet Active' : 'Live Google Sheet Active'} ·{' '}
                    {sheetAnalysis.tabName}
                  </p>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                    {sheetAnalysis.sheetTitle}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ReusableButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={feedbackLoading}
                    onClick={() => void handleGenerateAiSheetFeedback()}
                  >
                    {feedbackLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generate AI Sheet Feedback
                  </ReusableButton>

                  <button
                    type="button"
                    onClick={() =>
                      void handleCopyForKeep(
                        buildKeepSheetFeedbackNote(sheetAnalysis, aiFeedback),
                        'Sheet Mentor Feedback'
                      )
                    }
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#F97316]"
                  >
                    <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                    Copy to Keep
                  </button>

                  {!isSampleSheet && workspaceConnected && selectedSheetId && (
                    <button
                      type="button"
                      disabled={writingSheet}
                      onClick={() => {
                        playClick();
                        const today = new Date().toISOString().slice(0, 10);
                        const summaryText =
                          aiFeedback?.verdict || sheetAnalysis.constructiveFeedback.join(' ');
                        setPendingWrite({
                          kind: 'feedback',
                          spreadsheetId: selectedSheetId,
                          sheetTitle: sheetAnalysis.sheetTitle,
                          tabName: sheetAnalysis.tabName,
                          rows: [
                            [
                              today,
                              'Preps AI Mentor Review',
                              sheetAnalysis.weakestSubject || 'Overall',
                              sheetAnalysis.weakChapters[0]?.chapter || 'Summary',
                              sheetAnalysis.overallScorePercent,
                              100,
                              sheetAnalysis.overallAccuracyPercent,
                              0,
                              summaryText.slice(0, 240),
                            ],
                          ],
                        });
                      }}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#0B1B3B] dark:bg-slate-800 text-white text-xs font-semibold hover:opacity-95 disabled:opacity-60"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      Log Feedback to Sheet
                    </button>
                  )}
                </div>
              </div>

              {/* Accurate Verified Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500">Avg Sheet Score</p>
                  <p className="font-mono text-2xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
                    {sheetAnalysis.overallScorePercent}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sheetAnalysis.parsedCount} graded rows
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500">Overall Accuracy</p>
                  <p className="font-mono text-2xl font-extrabold text-[#2563EB] dark:text-sky-400 mt-0.5">
                    {sheetAnalysis.overallAccuracyPercent}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Verified from sheet data</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500">Progress Trend</p>
                  <p
                    className={`font-mono text-lg font-extrabold mt-1 flex items-center gap-1 ${
                      sheetAnalysis.trend === 'Improving'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : sheetAnalysis.trend === 'Declining'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-[#0B1B3B] dark:text-white'
                    }`}
                  >
                    {sheetAnalysis.trend === 'Improving' && <TrendingUp className="w-4 h-4" />}
                    {sheetAnalysis.trend === 'Declining' && <TrendingDown className="w-4 h-4" />}
                    {sheetAnalysis.trend}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sheetAnalysis.trendDeltaPercent >= 0 ? '+' : ''}
                    {sheetAnalysis.trendDeltaPercent}% recent shift
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500">Priority Focus</p>
                  <p className="text-sm font-bold text-[#F97316] mt-1 truncate">
                    {sheetAnalysis.weakestSubject || 'Balanced'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Strongest: {sheetAnalysis.strongestSubject || '—'}
                  </p>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              {sheetAnalysis.subjectSummaries.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs tabular-nums">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 uppercase text-[11px]">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Subject</th>
                        <th className="px-3.5 py-2.5 font-semibold">Entries</th>
                        <th className="px-3.5 py-2.5 font-semibold">Avg Score</th>
                        <th className="px-3.5 py-2.5 font-semibold">Accuracy</th>
                        <th className="px-3.5 py-2.5 font-semibold">Mistakes</th>
                        <th className="px-3.5 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sheetAnalysis.subjectSummaries.map((sub) => (
                        <tr key={sub.subject} className="bg-white dark:bg-[#111A2E]">
                          <td className="px-3.5 py-2.5 font-bold text-[#0B1B3B] dark:text-white">
                            {sub.subject}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                            {sub.entries}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold">
                            {sub.averageScorePercent}%
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-[#2563EB] dark:text-sky-400">
                            {sub.averageAccuracyPercent}%
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-rose-600 dark:text-rose-400">
                            {sub.totalMistakes}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold">
                            <span
                              className={
                                sub.status === 'Strong'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : sub.status === 'Priority Focus'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-amber-600 dark:text-amber-400'
                              }
                            >
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Deterministic Sheet Takeaways */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/60 space-y-1.5">
                <p className="text-xs font-bold text-[#0B1B3B] dark:text-white">
                  Data-Verified Progress Summary
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  {sheetAnalysis.constructiveFeedback.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              {feedbackError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {feedbackError}
                </div>
              )}

              {/* AI Mentor Constructive Feedback Report */}
              {aiFeedback && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#2563EB]" />
                      Constructive AI Mentor Feedback
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenChatWithPrompt(
                          `Based on my "${sheetAnalysis.sheetTitle}" sheet (${sheetAnalysis.overallAccuracyPercent}% avg accuracy, weakest subject ${sheetAnalysis.weakestSubject || 'overall'}), help me execute this next step: ${aiFeedback.recommendedNextAction}`
                        )
                      }
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      Discuss in Mentor Chat →
                    </button>
                  </div>

                  <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                    {aiFeedback.verdict}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Progress Trend:</strong> {aiFeedback.progressTrendNote}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                        Key Strengths
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                        {(aiFeedback.strengths ?? []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800">
                      <p className="font-bold text-rose-700 dark:text-rose-400 mb-1.5">
                        Priority Growth Areas
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                        {(aiFeedback.priorityWeakAreas ?? []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                    <p className="font-bold text-[#0B1B3B] dark:text-white">
                      Constructive Study Recommendations
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                      {(aiFeedback.constructiveAdvice ?? []).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                    <p className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[#2563EB] dark:text-sky-400 font-semibold">
                      Next 30-Minute Action: {aiFeedback.recommendedNextAction}
                    </p>
                  </div>
                </div>
              )}
            </ReusableCard>
          ) : (
            <ReusableCard padding="md" className="text-center py-8 space-y-3">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-[#0B1B3B] dark:text-white">
                No Student Spreadsheet Loaded Yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Sign in with Google to analyze your live Google Sheets tracker, or click{' '}
                <strong>Load Sample Student Sheet</strong> above to preview instant progress
                analysis and constructive mentor feedback.
              </p>
            </ReusableCard>
          )}
        </div>
      )}

      {/* TAB: CHAPTER SUMMARY & PERSONALIZED LEARNING PATH */}
      {activeTab === 'learning-path' && (
        <ReusableCard padding="md" className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2563EB]" />
              Personalized Chapter Learning Path Builder
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Summarize any chapter into a tailored study roadmap combining your Google Sheet
              performance data and Google Keep revision notes.
            </p>
          </div>

          {weakChapterSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Suggested from your Performance Sheet
              </p>
              <div className="flex flex-wrap gap-2">
                {weakChapterSuggestions.map((ch) => (
                  <button
                    key={`${ch.subject}-${ch.chapter}`}
                    type="button"
                    onClick={() => {
                      playClick();
                      setLpSubject(
                        SUBJECT_OPTIONS.includes(ch.subject) ? ch.subject : 'General'
                      );
                      setLpChapter(ch.chapter);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-[#2563EB] text-[#0B1B3B] dark:text-slate-200 tabular-nums"
                  >
                    {ch.chapter} ({ch.averageAccuracyPercent}%)
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleBuildLearningPath();
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
          >
            <div className="sm:col-span-3">
              <label htmlFor="lp-subject" className="sr-only">
                Subject
              </label>
              <select
                id="lp-subject"
                value={lpSubject}
                onChange={(e) => setLpSubject(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
              >
                {SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="lp-chapter" className="sr-only">
                Chapter Name
              </label>
              <input
                id="lp-chapter"
                type="text"
                value={lpChapter}
                onChange={(e) => setLpChapter(e.target.value)}
                placeholder="Enter chapter (e.g., Rotational Motion, Chemical Kinetics)..."
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <ReusableButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={lpLoading}
                className="w-full h-10 justify-center"
              >
                {lpLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Build Learning Path
              </ReusableButton>
            </div>
          </form>

          {lpError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {lpError}
            </div>
          )}

          {learningPath && (
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#2563EB] dark:text-sky-400">
                    {learningPath.subjectName} · {learningPath.readinessLevel}
                  </p>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                    {learningPath.chapterName} — Personalized Study Path
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void handleCopyForKeep(
                        buildKeepLearningPathNote(learningPath),
                        `${learningPath.chapterName} Learning Path`
                      )
                    }
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#F97316]"
                  >
                    <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                    Copy for Google Keep
                    <Copy className="w-3 h-3 opacity-60" />
                  </button>

                  <a
                    href="https://keep.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold"
                  >
                    Open Keep
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                {learningPath.chapterSummary}
              </p>

              {/* Formulas & Mental Models */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-[#0B1B3B] dark:text-white">
                  Key Formulas &amp; Mental Models
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(learningPath.keyFormulasAndConcepts ?? []).map((formula, idx) => (
                    <li
                      key={idx}
                      className="px-3 py-2 rounded-lg bg-white dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                    >
                      {formula}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Numbered Learning Path Steps */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-[#0B1B3B] dark:text-white">
                  Step-by-Step Personalized Sequence
                </p>
                <div className="space-y-2.5">
                  {(learningPath.learningSteps ?? []).map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[#0B1B3B] dark:text-white">
                          Step {step.stepNumber}: {step.phase}
                        </p>
                        <span className="font-mono text-[11px] font-semibold text-[#2563EB] dark:text-sky-400 tabular-nums">
                          {step.durationMinutes} min
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{step.objective}</p>
                      <ul className="list-disc pl-4 text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                        {(step.actionItems ?? []).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exam Traps */}
              {(learningPath.examTrapsToAvoid ?? []).length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    High-Yield Exam Traps to Avoid
                  </p>
                  <ul className="list-disc pl-4 text-xs text-amber-950/90 dark:text-amber-200 space-y-1">
                    {learningPath.examTrapsToAvoid.map((trap, i) => (
                      <li key={i}>{trap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </ReusableCard>
      )}

      {/* TAB: ADAPTIVE PRACTICE QUESTION GENERATOR */}
      {activeTab === 'practice' && (
        <ReusableCard padding="md" className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#F97316]" />
              Adaptive Practice Question Generator
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Generate targeted chapter practice questions calibrated to your weak concepts from
              Google Sheets and Keep notes, with instant grading and step-by-step explanations.
            </p>
          </div>

          {weakChapterSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Suggested from your Performance Sheet
              </p>
              <div className="flex flex-wrap gap-2">
                {weakChapterSuggestions.map((ch) => (
                  <button
                    key={`pq-${ch.subject}-${ch.chapter}`}
                    type="button"
                    onClick={() => {
                      playClick();
                      setPqSubject(
                        SUBJECT_OPTIONS.includes(ch.subject) ? ch.subject : 'General'
                      );
                      setPqChapter(ch.chapter);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-[#F97316] text-[#0B1B3B] dark:text-slate-200 tabular-nums"
                  >
                    {ch.chapter} ({ch.averageAccuracyPercent}%)
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleGeneratePracticeQuiz();
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
          >
            <div className="sm:col-span-3">
              <label htmlFor="pq-subject" className="sr-only">
                Subject
              </label>
              <select
                id="pq-subject"
                value={pqSubject}
                onChange={(e) => setPqSubject(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
              >
                {SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="pq-chapter" className="sr-only">
                Chapter Name
              </label>
              <input
                id="pq-chapter"
                type="text"
                value={pqChapter}
                onChange={(e) => setPqChapter(e.target.value)}
                placeholder="Chapter (e.g., Electrostatics)..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="pq-difficulty" className="sr-only">
                Difficulty
              </label>
              <select
                id="pq-difficulty"
                value={pqDifficulty}
                onChange={(e) =>
                  setPqDifficulty(e.target.value as 'Foundation' | 'Exam Level' | 'Challenge')
                }
                className="w-full h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
              >
                <option value="Foundation">Foundation</option>
                <option value="Exam Level">Exam Level</option>
                <option value="Challenge">Challenge</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <ReusableButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={pqLoading}
                className="w-full h-10 justify-center"
              >
                {pqLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate {pqCount} Questions
              </ReusableButton>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Set size:</span>
              {[3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPqCount(n)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold tabular-nums ${
                    pqCount === n
                      ? 'bg-[#0B1B3B] dark:bg-[#2563EB] text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {n} Questions
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-pressed={practiceImageMode}
              onClick={() => {
                playClick();
                setPracticeImageMode((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                practiceImageMode
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:border-sky-400 dark:text-sky-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {practiceImageMode ? 'Image Format: ON' : 'Image Format: OFF'}
            </button>
          </div>

          {pqError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {pqError}
            </div>
          )}

          {practiceQuestions.length > 0 && (
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              {practiceQuestions.map((q, idx) => {
                const chosen = selectedAnswers[q.id];
                const isCorrect = quizChecked && chosen === q.correctIndex;
                const hintKey = `hint-${q.id}`;
                const expKey = `exp-${q.id}`;
                return (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#2563EB] dark:text-sky-400">
                        Q{idx + 1} · {q.conceptTag} ({q.difficulty})
                      </span>
                      {!quizChecked && q.hint && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedHints((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          {revealedHints[q.id] ? 'Hide Hint' : 'Show Hint'}
                        </button>
                      )}
                    </div>

                    {practiceImageMode ? (
                      <img
                        src={renderQuestionImageDataUrl({
                          questionNumber: idx + 1,
                          subjectName: pqSubject,
                          chapterName: q.conceptTag || pqChapter,
                          questionText: q.question,
                          theme: imageTheme,
                        })}
                        alt={`Question ${idx + 1}: ${q.question}`}
                        className="w-full h-auto rounded-xl object-contain block"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-[#0B1B3B] dark:text-white leading-relaxed">
                        {q.question}
                      </p>
                    )}

                    {revealedHints[q.id] && !quizChecked && (
                      <div className="flex items-start justify-between gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-lg border border-amber-200/70 dark:border-amber-800">
                        <p className="leading-relaxed">Hint: {q.hint}</p>
                        <button
                          type="button"
                          onClick={() => toggleSpeakText(hintKey, q.hint)}
                          aria-label={speakingKey === hintKey ? 'Stop reading hint' : 'Listen to hint'}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-300 dark:border-amber-700 bg-white/80 dark:bg-amber-900/40 text-[11px] font-semibold shrink-0"
                        >
                          {speakingKey === hintKey ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                          {speakingKey === hintKey ? 'Stop' : 'Listen'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(q.options ?? []).map((opt, optIdx) => {
                        const letter = ['A', 'B', 'C', 'D'][optIdx] ?? String(optIdx + 1);
                        const isPicked = chosen === optIdx;
                        const isRightOpt = optIdx === q.correctIndex;
                        const visualState = quizChecked
                          ? isRightOpt
                            ? 'correct'
                            : isPicked
                              ? 'wrong'
                              : 'default'
                          : isPicked
                            ? 'selected'
                            : 'default';

                        let styleClass =
                          'bg-white dark:bg-[#111A2E] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB]';
                        if (quizChecked) {
                          if (isRightOpt) {
                            styleClass =
                              'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold';
                          } else if (isPicked && !isRightOpt) {
                            styleClass =
                              'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200';
                          }
                        } else if (isPicked) {
                          styleClass =
                            'bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#0B1B3B] dark:text-white font-semibold';
                        }

                        if (practiceImageMode) {
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={quizChecked}
                              aria-pressed={isPicked}
                              aria-label={`Option ${letter}: ${opt}`}
                              onClick={() => {
                                playClick();
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                              }}
                              className={`w-full text-left rounded-xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                                isPicked && !quizChecked ? 'ring-2 ring-[#2563EB]' : ''
                              }`}
                            >
                              <img
                                src={renderOptionImageDataUrl({
                                  label: letter,
                                  text: opt,
                                  theme: imageTheme,
                                  state: visualState,
                                })}
                                alt={`Option ${letter}: ${opt}`}
                                className="w-full h-auto object-contain rounded-xl block"
                              />
                            </button>
                          );
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={quizChecked}
                            onClick={() => {
                              playClick();
                              setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                            }}
                            className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-colors flex items-start gap-2 ${styleClass}`}
                          >
                            <span className="font-mono font-bold shrink-0">{letter}.</span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {quizChecked && (
                      <div
                        className={`p-3 rounded-lg text-xs border space-y-1.5 ${
                          isCorrect
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-100 dark:bg-[#0D1527] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold">
                            {isCorrect
                              ? 'Correct!'
                              : `Correct Answer: ${['A', 'B', 'C', 'D'][q.correctIndex] ?? ''}`}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleSpeakText(expKey, q.explanation)}
                            aria-label={
                              speakingKey === expKey
                                ? 'Stop reading explanation'
                                : 'Listen to Hinglish explanation'
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/70 text-[11px] font-semibold"
                          >
                            {speakingKey === expKey ? (
                              <VolumeX className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                            {speakingKey === expKey ? 'Stop' : 'Listen'}
                          </button>
                        </div>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {!quizChecked ? (
                  <ReusableButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      playSuccess();
                      setQuizChecked(true);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Check Answers &amp; Explanations
                  </ReusableButton>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                    {quizScore && (
                      <p className="text-sm font-bold text-[#0B1B3B] dark:text-white tabular-nums">
                        Practice Score: {quizScore.correct}/{quizScore.total} ({quizScore.percent}%)
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyForKeep(
                            buildKeepPracticeMistakesNote(
                              pqChapter,
                              pqSubject,
                              practiceQuestions,
                              selectedAnswers
                            ),
                            'Practice Revision Notes'
                          )
                        }
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#F97316]"
                      >
                        <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                        Copy Revision Notes to Keep
                      </button>

                      {!isSampleSheet &&
                        workspaceConnected &&
                        selectedSheetId &&
                        sheetAnalysis &&
                        quizScore && (
                          <button
                            type="button"
                            disabled={writingSheet}
                            onClick={() => {
                              playClick();
                              const today = new Date().toISOString().slice(0, 10);
                              setPendingWrite({
                                kind: 'quiz',
                                spreadsheetId: selectedSheetId,
                                sheetTitle: sheetAnalysis.sheetTitle,
                                tabName: sheetAnalysis.tabName,
                                rows: [
                                  [
                                    today,
                                    `AI Practice Drill (${pqDifficulty})`,
                                    pqSubject,
                                    pqChapter,
                                    quizScore.correct,
                                    quizScore.total,
                                    quizScore.percent,
                                    quizScore.total - quizScore.correct,
                                    'Generated & completed in Preps AI Tutor Studio',
                                  ],
                                ],
                              });
                            }}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Log Score to Google Sheet
                          </button>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ReusableCard>
      )}

      {/* SHARED GOOGLE KEEP STUDY NOTES BRIDGE */}
      <ReusableCard padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5">
              <StickyNote className="w-4 h-4 text-amber-500" />
              Google Keep Study Notes Context ({keepNotes.length})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Paste your Google Keep formulas, chapter notes, or doubts here so the AI Tutor tailors
              feedback, learning paths, and practice questions directly to your notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                setKeepFormOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B1B3B] dark:bg-[#2563EB] text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              {keepFormOpen ? 'Close Note Form' : 'Add Keep Note'}
            </button>

            <a
              href="https://keep.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-500"
            >
              Open Keep
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {keepFormOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!keepTitle.trim() || !keepContent.trim()) return;
              playSuccess();
              onAddKeepNote({
                title: keepTitle.trim(),
                subject: keepSubject,
                chapter: keepChapter.trim() || 'General',
                content: keepContent.trim(),
              });
              setKeepTitle('');
              setKeepChapter('');
              setKeepContent('');
              setKeepFormOpen(false);
            }}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={keepTitle}
                onChange={(e) => setKeepTitle(e.target.value)}
                placeholder="Note title (e.g., Rotational Formulas)"
                aria-label="Google Keep note title"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <select
                value={keepSubject}
                onChange={(e) => setKeepSubject(e.target.value)}
                aria-label="Google Keep note subject"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={keepChapter}
                onChange={(e) => setKeepChapter(e.target.value)}
                placeholder="Chapter name (optional)"
                aria-label="Google Keep note chapter"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>

            <textarea
              required
              rows={3}
              value={keepContent}
              onChange={(e) => setKeepContent(e.target.value)}
              placeholder="Paste your Google Keep study note, formula sheet highlights, or doubts..."
              aria-label="Google Keep note content"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                Save to AI Tutor Context
              </button>
            </div>
          </form>
        )}

        {keepNotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {keepNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-xl bg-amber-50/45 dark:bg-amber-950/15 border border-amber-200/70 dark:border-amber-900/40 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0B1B3B] dark:text-white truncate">
                    {note.title}
                  </p>
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {note.subject} · {note.chapter}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {note.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onDeleteKeepNote(note.id);
                  }}
                  aria-label={`Remove study note "${note.title}"`}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ReusableCard>

      {/* MANDATORY EXPLICIT CONFIRMATION MODAL BEFORE WRITING TO GOOGLE SHEETS */}
      {pendingWrite && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutor-sheet-write-confirm-title"
          className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F182D] border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h3
                  id="tutor-sheet-write-confirm-title"
                  className="font-display text-base font-bold text-[#0B1B3B] dark:text-white"
                >
                  Confirm Update to Google Sheet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingWrite(null)}
                aria-label="Cancel Google Sheet update"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                Append{' '}
                <strong className="text-[#0B1B3B] dark:text-white">
                  {pendingWrite.rows.length} new row{pendingWrite.rows.length === 1 ? '' : 's'}
                </strong>{' '}
                ({pendingWrite.kind === 'quiz' ? 'practice quiz score' : 'mentor feedback review'})
                to your Google Sheet{' '}
                <strong className="text-[#0B1B3B] dark:text-white">
                  {pendingWrite.sheetTitle}
                </strong>{' '}
                (tab: <strong>{pendingWrite.tabName}</strong>)?
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-words">
                {pendingWrite.rows[0]?.join(' | ')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingWrite(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeConfirmedSheetWrite()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B1B3B] dark:bg-[#2563EB] text-white hover:opacity-95"
              >
                Confirm &amp; Append Row
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
