import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Database,
  FileUp,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { Sidebar } from '../components/Sidebar';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { QuestionPaperBuilder } from '../components/admin/QuestionPaperBuilder';
import { PdfQuestionExtractorPanel } from '../components/admin/PdfQuestionExtractorPanel';
import { SupportInboxPanel } from '../components/admin/SupportInboxPanel';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { createSeoSlug } from '../utils/weeklySchedule';
import { generateCleanSlug } from '../utils/seoHelpers';
import { playClick, playSuccess } from '../utils/soundEffects';
import {
  deleteChapterDoc,
  deleteClassGroupDoc,
  deleteLectureDoc,
  deleteMaterialDoc,
  deleteSectionDoc,
  deleteSubjectDoc,
  makeSafeDocId,
  saveChapter,
  saveClassGroup,
  saveIqSettings,
  saveLecture,
  saveMaterial,
  saveSection,
  saveSubject,
  seedStarterCurriculumToFirestore,
  syncJeeConciseNotesToFirestore,
  uploadPlatformFile,
} from '../services/firestoreService';
import type {
  ChapterDifficulty,
  ChapterRecord,
  ClassGroupRecord,
  IQConfig,
  MaterialAttachment,
  MaterialMediaType,
  SectionRecord,
  SectionScope,
  SidebarSectionItem,
  StudentCohortId,
  StudyMaterialRecord,
  SubClassItem,
  SubjectRecord,
  VideoLectureRecord,
} from '../types';

const ADMIN_SECTIONS: SidebarSectionItem[] = [
  { id: 'ai-extractor', label: 'AI PDF Question Extractor', description: '4-Stage PDF → DPP / CBT / Arena' },
  { id: 'support-inbox', label: 'Chat Support Inbox', description: 'Student requests & bug queue' },
  { id: 'classes', label: 'Classes & Sub-Classes', description: 'Class 9–12, Board, JEE, NEET' },
  { id: 'subjects', label: 'Subjects & Sections', description: 'Multi-subject & chapter scopes' },
  { id: 'chapters', label: 'Chapter Manager', description: 'Add, edit & tag chapters' },
  { id: 'uploads', label: 'Materials & Videos', description: 'Instant PDF/Video + Thumbnails' },
  { id: 'tests', label: 'CBT / DPP Builder', description: 'Syllabus, instructions & cropper' },
  { id: 'iq', label: 'IQ Score Settings', description: 'Pace thresholds & weights' },
];

function extractTitleFromFilename(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function AdminPage() {
  const { firebaseUser, isAdmin, authReady, signInWithGoogle } = useAuth();
  const {
    classGroups,
    allCohorts,
    subjects,
    sections,
    chapters,
    materials,
    lectures,
    iqConfig,
    isUsingStarterCatalog,
  } = usePlatformData();

  const [activeTab, setActiveTab] = useState('ai-extractor');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [syncingJee, setSyncingJee] = useState(false);

  // =====================================
  // 0. CLASSES & SUB-CLASSES STATE
  // =====================================
  const [newClassName, setNewClassName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');

  // Inline Sub-Class editor per selected ClassGroup
  const [activeSubParentId, setActiveSubParentId] = useState<string>(classGroups[2]?.id ?? classGroups[0]?.id ?? '');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subLabel, setSubLabel] = useState('');
  const [subShortLabel, setSubShortLabel] = useState('');
  const [subStream, setSubStream] = useState('');
  const [subSubjectsText, setSubSubjectsText] = useState('Physics, Chemistry, Mathematics');
  const [subFocusSummary, setSubFocusSummary] = useState('');

  // =====================================
  // 1. SUBJECTS & SCOPED SECTIONS STATE
  // =====================================
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubCohorts, setNewSubCohorts] = useState<StudentCohortId[]>(['class-11-jee', 'class-12-jee']);

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [secName, setSecName] = useState('');
  const [secDesc, setSecDesc] = useState('');
  const [secScope, setSecScope] = useState<SectionScope>('all');
  const [secSubjectIds, setSecSubjectIds] = useState<string[]>([]);
  const [secChapterIds, setSecChapterIds] = useState<string[]>([]);

  // =====================================
  // 2. CHAPTERS STATE
  // =====================================
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapSubId, setChapSubId] = useState(subjects[0]?.id ?? '');
  const [chapName, setChapName] = useState('');
  const [chapWeightage, setChapWeightage] = useState(4);
  const [chapDifficulty, setChapDifficulty] = useState<ChapterDifficulty>('Moderate');
  const [chapCohorts, setChapCohorts] = useState<StudentCohortId[]>(['class-11-jee', 'class-12-jee']);

  // =====================================
  // 3. INSTANT MATERIALS (PDF / VIDEO / IMAGE / LINK) + EDIT STATE
  // =====================================
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [matTitle, setMatTitle] = useState('');
  const [matSubId, setMatSubId] = useState(subjects[0]?.id ?? '');
  const [matChapId, setMatChapId] = useState(chapters[0]?.id ?? '');
  const [matSectionName, setMatSectionName] = useState(sections[0]?.name ?? 'Short Notes');
  const [matMediaType, setMatMediaType] = useState<MaterialMediaType>('pdf');
  const [matFileUrl, setMatFileUrl] = useState('');
  const [matThumbUrl, setMatThumbUrl] = useState('');
  const [matDuration, setMatDuration] = useState(20);
  const [matDesc, setMatDesc] = useState('');
  const [matSeoSlug, setMatSeoSlug] = useState('');
  const [matSeoKeywords, setMatSeoKeywords] = useState('');
  const [matCohorts, setMatCohorts] = useState<StudentCohortId[]>(['class-12-jee', 'jee-dropper']);
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matThumbFile, setMatThumbFile] = useState<File | null>(null);
  const [matAttachments, setMatAttachments] = useState<MaterialAttachment[]>([]);
  const [attTitle, setAttTitle] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [attUploading, setAttUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [uploadingMat, setUploadingMat] = useState(false);
  const matFileInputRef = useRef<HTMLInputElement | null>(null);
  const matThumbInputRef = useRef<HTMLInputElement | null>(null);
  const attFileInputRef = useRef<HTMLInputElement | null>(null);

  // =====================================
  // 3b. VIDEO LECTURES (WITH THUMBNAIL + EDIT/DELETE)
  // =====================================
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [lecTitle, setLecTitle] = useState('');
  const [lecSubId, setLecSubId] = useState(subjects[0]?.id ?? '');
  const [lecChapId, setLecChapId] = useState(chapters[0]?.id ?? '');
  const [lecNum, setLecNum] = useState(lectures.length + 1);
  const [lecDuration, setLecDuration] = useState(45);
  const [lecUrl, setLecUrl] = useState('');
  const [lecThumbUrl, setLecThumbUrl] = useState('');
  const [lecDesc, setLecDesc] = useState('');
  const [lecFile, setLecFile] = useState<File | null>(null);
  const [lecThumbFile, setLecThumbFile] = useState<File | null>(null);
  const [uploadingLec, setUploadingLec] = useState(false);

  // =====================================
  // 5. IQ SETTINGS STATE
  // =====================================
  const [iqDraft, setIqDraft] = useState<IQConfig>(iqConfig);
  const [savingIq, setSavingIq] = useState(false);

  const allCohortIds = useMemo(() => allCohorts.map((c) => c.id), [allCohorts]);

  const activeParentGroup = useMemo(
    () => classGroups.find((g) => g.id === activeSubParentId) ?? classGroups[0] ?? null,
    [activeSubParentId, classGroups]
  );

  const matAvailableChapters = useMemo(
    () => chapters.filter((c) => !matSubId || c.subjectId === matSubId),
    [chapters, matSubId]
  );

  // Strict Role-Based Access Guard
  if (!authReady) {
    return (
      <PageLayout>
        <SeoHead
          title="Admin Console — PREPSKM.IN"
          description="Protected faculty and administrator workspace."
          canonicalPath="/admin"
          noIndex
        />
        <ResponsiveContainer className="py-20 text-center">
          <p className="text-sm text-slate-500">Verifying administrator credentials...</p>
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return (
      <PageLayout>
        <SeoHead
          title="Admin Access Required — PREPSKM.IN"
          description="Restricted administrator workspace for PREPSKM.IN."
          canonicalPath="/admin"
          noIndex
        />
        <ResponsiveContainer size="narrow" className="py-16">
          <ReusableCard className="max-w-lg mx-auto text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              {firebaseUser ? <ShieldAlert className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white">
              {firebaseUser ? 'Access Denied — Unauthorized Account' : 'Administrator Sign-In Required'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {firebaseUser
                ? `Signed in as ${firebaseUser.email}, which does not have administrator privileges on PREPSKM.IN. Only authorized faculty accounts can manage classes, study materials, CBT papers, and platform settings.`
                : 'This workspace is protected by Firebase Authentication and Firestore role rules. Sign in with an authorized PREPSKM administrator Google account to continue.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {!firebaseUser && (
                <ReusableButton variant="primary" onClick={() => void signInWithGoogle()}>
                  Sign In with Admin Google Account
                </ReusableButton>
              )}
              <ReusableButton variant="secondary" to="/">
                Return to Home
              </ReusableButton>
            </div>
          </ReusableCard>
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  // =====================================
  // SEEDING HANDLER
  // =====================================
  const handleSeedStarter = async () => {
    setSeeding(true);
    setFeedback(null);
    try {
      await seedStarterCurriculumToFirestore();
      playSuccess();
      setFeedback({
        type: 'ok',
        text: 'Starter curriculum + 82 JEE Concise Notes chapters synced to live Firestore.',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Seeding failed.' });
    } finally {
      setSeeding(false);
    }
  };

  const handleSyncJeeNotes = async () => {
    setSyncingJee(true);
    setFeedback(null);
    try {
      await syncJeeConciseNotesToFirestore();
      playSuccess();
      setFeedback({
        type: 'ok',
        text: 'Synced Concise Notes section + all 82 Class 11 & Class 12 JEE chapters & PDFs to Firestore!',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'JEE Notes sync failed.' });
    } finally {
      setSyncingJee(false);
    }
  };

  // =====================================
  // CLASS & SUB-CLASS HANDLERS
  // =====================================
  const handleAddClassGroup = async () => {
    if (!newClassName.trim()) {
      setFeedback({ type: 'err', text: 'Enter a Class Name (e.g. Class 11 or Foundation).' });
      return;
    }
    const cleanName = newClassName.trim();
    const id = `cg-${createSeoSlug(cleanName)}-${Date.now().toString(36).slice(-4)}`;
    try {
      await saveClassGroup(
        {
          id,
          name: cleanName,
          order: classGroups.length + 1,
          subClasses: [
            {
              id: `${createSeoSlug(cleanName)}-board`,
              label: `${cleanName} — Board`,
              shortLabel: `${cleanName} Board`,
              stream: 'Board Exam Track',
              focusSummary: 'NCERT concepts, derivations, and full board practice.',
              subjects: ['Physics', 'Chemistry', 'Mathematics'],
            },
          ],
        },
        false
      );
      setNewClassName('');
      setActiveSubParentId(id);
      playSuccess();
      setFeedback({ type: 'ok', text: `Class "${cleanName}" created with starter Board sub-class.` });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to create class.' });
    }
  };

  const handleRenameClassGroup = async (group: ClassGroupRecord) => {
    if (!editGroupName.trim()) return;
    try {
      await saveClassGroup({ ...group, name: editGroupName.trim() }, true);
      setEditingGroupId(null);
      setEditGroupName('');
      playSuccess();
      setFeedback({ type: 'ok', text: `Renamed class to "${editGroupName.trim()}".` });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Rename failed.' });
    }
  };

  const resetSubClassForm = () => {
    setEditingSubId(null);
    setSubLabel('');
    setSubShortLabel('');
    setSubStream('');
    setSubSubjectsText('Physics, Chemistry, Mathematics');
    setSubFocusSummary('');
  };

  const handleLoadSubClassForEdit = (sub: SubClassItem) => {
    setEditingSubId(sub.id);
    setSubLabel(sub.label);
    setSubShortLabel(sub.shortLabel);
    setSubStream(sub.stream);
    setSubSubjectsText(sub.subjects.join(', '));
    setSubFocusSummary(sub.focusSummary);
  };

  const handleSaveSubClass = async () => {
    if (!activeParentGroup) return;
    if (!subLabel.trim() || !subShortLabel.trim()) {
      setFeedback({ type: 'err', text: 'Enter both Full Label (e.g. Class 11 — NEET) and Short Label (e.g. NEET).' });
      return;
    }

    const subjectsArr = subSubjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const subItem: SubClassItem = {
      id: editingSubId ?? `${createSeoSlug(activeParentGroup.name)}-${createSeoSlug(subShortLabel)}-${Date.now().toString(36).slice(-3)}`,
      label: subLabel.trim(),
      shortLabel: subShortLabel.trim(),
      stream: subStream.trim() || `${subShortLabel.trim()} Track`,
      focusSummary:
        subFocusSummary.trim() || 'Structured chapters, formula notes, DPPs, and timed CBT mocks.',
      subjects: subjectsArr.length > 0 ? subjectsArr : ['Physics', 'Chemistry'],
    };

    const nextSubClasses = editingSubId
      ? activeParentGroup.subClasses.map((s) => (s.id === editingSubId ? subItem : s))
      : [...activeParentGroup.subClasses, subItem];

    try {
      await saveClassGroup({ ...activeParentGroup, subClasses: nextSubClasses }, true);
      resetSubClassForm();
      playSuccess();
      setFeedback({
        type: 'ok',
        text: editingSubId
          ? `Updated sub-class "${subItem.shortLabel}" under ${activeParentGroup.name}.`
          : `Added sub-class "${subItem.shortLabel}" under ${activeParentGroup.name}.`,
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save sub-class.' });
    }
  };

  const handleDeleteSubClass = async (group: ClassGroupRecord, subId: string) => {
    if (group.subClasses.length <= 1) {
      setFeedback({ type: 'err', text: 'Each Class must retain at least 1 Sub-Class (or delete the entire Class).' });
      return;
    }
    try {
      await saveClassGroup(
        { ...group, subClasses: group.subClasses.filter((s) => s.id !== subId) },
        true
      );
      if (editingSubId === subId) resetSubClassForm();
      setFeedback({ type: 'ok', text: 'Sub-class removed.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to remove sub-class.' });
    }
  };

  // =====================================
  // SUBJECTS & SCOPED SECTIONS HANDLERS
  // =====================================
  const resetSubjectForm = () => {
    setEditingSubjectId(null);
    setNewSubName('');
    setNewSubCode('');
    setNewSubCohorts(['class-11-jee', 'class-12-jee']);
  };

  const handleLoadSubjectForEdit = (sub: SubjectRecord) => {
    setEditingSubjectId(sub.id);
    setNewSubName(sub.name);
    setNewSubCode(sub.code);
    setNewSubCohorts(sub.cohorts.length > 0 ? sub.cohorts : allCohortIds);
    playClick();
  };

  const handleAddSubject = async () => {
    if (!newSubName.trim() || !newSubCode.trim()) {
      setFeedback({ type: 'err', text: 'Enter both Subject Name and Subject Code.' });
      return;
    }
    const targetCohorts = newSubCohorts.length > 0 ? newSubCohorts : allCohortIds;
    const existing = editingSubjectId ? subjects.find((s) => s.id === editingSubjectId) : null;
    try {
      await saveSubject(
        {
          id: editingSubjectId ?? makeSafeDocId('sub'),
          name: newSubName.trim(),
          code: newSubCode.trim().toUpperCase(),
          order: existing?.order ?? subjects.length + 1,
          cohorts: targetCohorts,
        },
        Boolean(editingSubjectId)
      );
      playSuccess();
      setFeedback({
        type: 'ok',
        text: editingSubjectId
          ? `Subject "${newSubName.trim()}" updated for ${targetCohorts.length} sub-class(es).`
          : `Subject "${newSubName.trim()}" added exclusively to ${targetCohorts.length} selected sub-class(es).`,
      });
      resetSubjectForm();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save subject.' });
    }
  };

  const handleReorderSubject = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= subjects.length) return;
    const a = subjects[idx];
    const b = subjects[target];
    await saveSubject({ ...a, order: b.order }, true);
    await saveSubject({ ...b, order: a.order }, true);
  };

  const resetSectionForm = () => {
    setEditingSectionId(null);
    setSecName('');
    setSecDesc('');
    setSecScope('all');
    setSecSubjectIds([]);
    setSecChapterIds([]);
  };

  const handleLoadSectionForEdit = (sec: SectionRecord) => {
    setEditingSectionId(sec.id);
    setSecName(sec.name);
    setSecDesc(sec.description ?? '');
    setSecScope(sec.scope ?? 'all');
    setSecSubjectIds(sec.subjectIds ?? []);
    setSecChapterIds(sec.chapterIds ?? []);
  };

  const handleSaveSection = async () => {
    if (!secName.trim()) {
      setFeedback({ type: 'err', text: 'Enter a section name (e.g. NCERT Line-by-Line or Revision Mind Maps).' });
      return;
    }
    if (secScope === 'subjects' && secSubjectIds.length === 0) {
      setFeedback({ type: 'err', text: 'Select at least one Subject for this multi-subject section.' });
      return;
    }
    if (secScope === 'chapters' && secChapterIds.length === 0) {
      setFeedback({ type: 'err', text: 'Select at least one specific Chapter for this section.' });
      return;
    }

    const existing = editingSectionId ? sections.find((s) => s.id === editingSectionId) : null;
    const slug = createSeoSlug(secName.trim());

    try {
      await saveSection(
        {
          id: editingSectionId ?? makeSafeDocId('sec'),
          name: secName.trim(),
          slug,
          order: existing?.order ?? sections.length + 1,
          description: secDesc.trim(),
          scope: secScope,
          subjectIds: secScope === 'subjects' ? secSubjectIds : [],
          chapterIds: secScope === 'chapters' ? secChapterIds : [],
        },
        Boolean(editingSectionId)
      );
      playSuccess();
      setFeedback({
        type: 'ok',
        text: editingSectionId
          ? `Section "${secName.trim()}" updated live.`
          : `Section "${secName.trim()}" created with "${secScope}" scope.`,
      });
      resetSectionForm();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save section.' });
    }
  };

  // =====================================
  // CHAPTER HANDLER
  // =====================================
  const resetChapterForm = () => {
    setEditingChapterId(null);
    setChapName('');
    setChapWeightage(4);
    setChapDifficulty('Moderate');
  };

  const handleLoadChapterForEdit = (ch: ChapterRecord) => {
    setEditingChapterId(ch.id);
    setChapSubId(ch.subjectId);
    setChapName(ch.name);
    setChapWeightage(ch.weightageMarks);
    setChapDifficulty(ch.difficulty);
    setChapCohorts(ch.cohorts.length > 0 ? ch.cohorts : allCohortIds);
    playClick();
  };

  const handleAddChapter = async () => {
    if (!chapName.trim() || !chapSubId) {
      setFeedback({ type: 'err', text: 'Select a subject and enter a chapter name.' });
      return;
    }
    const targetCohorts = chapCohorts.length > 0 ? chapCohorts : allCohortIds;
    const existing = editingChapterId ? chapters.find((c) => c.id === editingChapterId) : null;
    try {
      await saveChapter(
        {
          id: editingChapterId ?? makeSafeDocId('ch'),
          subjectId: chapSubId,
          name: chapName.trim(),
          order: existing?.order ?? chapters.filter((c) => c.subjectId === chapSubId).length + 1,
          cohorts: targetCohorts,
          weightageMarks: chapWeightage,
          difficulty: chapDifficulty,
        },
        Boolean(editingChapterId)
      );
      playSuccess();
      setFeedback({
        type: 'ok',
        text: editingChapterId
          ? `Chapter "${chapName.trim()}" updated for ${targetCohorts.length} sub-class(es).`
          : `Chapter "${chapName.trim()}" added strictly to ${targetCohorts.length} selected sub-class(es).`,
      });
      resetChapterForm();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save chapter.' });
    }
  };

  // =====================================
  // INSTANT MATERIAL (PDF / VIDEO / IMAGE) UPLOAD & EDIT
  // =====================================
  const resetMaterialForm = () => {
    setEditingMaterialId(null);
    setMatTitle('');
    setMatDesc('');
    setMatFileUrl('');
    setMatThumbUrl('');
    setMatSeoSlug('');
    setMatSeoKeywords('');
    setMatDuration(20);
    setMatFile(null);
    setMatThumbFile(null);
    setMatAttachments([]);
    setAttTitle('');
    setAttUrl('');
    setUploadPct(0);
    if (matFileInputRef.current) matFileInputRef.current.value = '';
    if (matThumbInputRef.current) matThumbInputRef.current.value = '';
    if (attFileInputRef.current) attFileInputRef.current.value = '';
  };

  const handleAddAttachmentFile = async (file: File | null) => {
    if (!file) return;
    if (matAttachments.length >= 10) {
      setFeedback({ type: 'err', text: 'Maximum 10 attachments can be tagged per video.' });
      return;
    }
    setAttUploading(true);
    setFeedback(null);
    try {
      const uploaded = await uploadPlatformFile({
        folder: 'materials',
        file,
        kind: 'document',
      });
      const label = attTitle.trim() || extractTitleFromFilename(file.name);
      setMatAttachments((prev) => [
        ...prev,
        {
          id: makeSafeDocId('att'),
          title: label,
          fileUrl: uploaded.downloadUrl,
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type || 'application/pdf',
        },
      ]);
      setAttTitle('');
      if (attFileInputRef.current) attFileInputRef.current.value = '';
      playSuccess();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to attach file.',
      });
    } finally {
      setAttUploading(false);
    }
  };

  const handleAddAttachmentUrl = () => {
    if (!attUrl.trim()) {
      setFeedback({ type: 'err', text: 'Paste a PDF or file URL to attach.' });
      return;
    }
    if (matAttachments.length >= 10) {
      setFeedback({ type: 'err', text: 'Maximum 10 attachments can be tagged per video.' });
      return;
    }
    const label = attTitle.trim() || 'Attached Study PDF';
    setMatAttachments((prev) => [
      ...prev,
      {
        id: makeSafeDocId('att'),
        title: label,
        fileUrl: attUrl.trim(),
        fileName: `${createSeoSlug(label)}.pdf`,
        mimeType: 'application/pdf',
      },
    ]);
    setAttTitle('');
    setAttUrl('');
    playClick();
  };

  const handleLoadMaterialForEdit = (m: StudyMaterialRecord) => {
    setEditingMaterialId(m.id);
    setMatTitle(m.title);
    setMatSubId(m.subjectId);
    setMatChapId(m.chapterId);
    setMatSectionName(m.sectionName || m.resourceType);
    setMatMediaType(m.mediaType ?? 'pdf');
    setMatFileUrl(m.fileUrl);
    setMatThumbUrl(m.thumbnailUrl ?? '');
    setMatDuration(m.durationMinutes ?? 20);
    setMatDesc(m.description ?? '');
    setMatSeoSlug(m.seoSlug ?? createSeoSlug(m.title));
    setMatSeoKeywords(m.seoKeywords ?? '');
    setMatCohorts(m.cohorts.length > 0 ? m.cohorts : allCohortIds);
    setMatAttachments(m.attachments ?? []);
    setMatFile(null);
    setMatThumbFile(null);
    playClick();
  };

  const handleSaveMaterial = async () => {
    if (!matTitle.trim()) {
      setFeedback({ type: 'err', text: 'Enter a title for this resource.' });
      return;
    }
    if (!matFile && !matFileUrl.trim()) {
      setFeedback({
        type: 'err',
        text: 'Select a PDF/Image/Video file from your device OR paste a direct/YouTube URL.',
      });
      return;
    }

    setUploadingMat(true);
    setUploadPct(15);
    setFeedback(null);

    try {
      let finalFileUrl = matFileUrl.trim();
      let storagePath: string | undefined;
      let fileName: string | undefined;
      let fileSizeBytes: number | undefined;
      let mimeType: string | undefined;

      if (matFile) {
        const uploaded = await uploadPlatformFile({
          folder: 'materials',
          file: matFile,
          kind:
            matMediaType === 'video'
              ? 'video'
              : matMediaType === 'image'
                ? 'image'
                : 'document',
          onProgress: setUploadPct,
        });
        finalFileUrl = uploaded.downloadUrl;
        storagePath = uploaded.storagePath || undefined;
        fileName = matFile.name;
        fileSizeBytes = matFile.size;
        mimeType = matFile.type || (matMediaType === 'video' ? 'video/mp4' : 'application/pdf');
      }

      let finalThumbUrl = matThumbUrl.trim();
      if (matThumbFile) {
        const thumbUploaded = await uploadPlatformFile({
          folder: 'thumbnails',
          file: matThumbFile,
          kind: 'thumbnail',
        });
        finalThumbUrl = thumbUploaded.downloadUrl;
      }

      const cleanSlug = generateCleanSlug(matSeoSlug.trim() || matTitle.trim(), 'material');
      const targetChapId =
        matChapId && chapters.some((c) => c.id === matChapId)
          ? matChapId
          : matAvailableChapters[0]?.id ?? chapters[0]?.id ?? 'chap-phy-electrostatics';
      const resolvedSubName = subjects.find((s) => s.id === (matSubId || subjects[0]?.id))?.name ?? 'Study';
      const resolvedChapName = chapters.find((c) => c.id === targetChapId)?.name ?? '';
      const autoSeoDesc = (
        matDesc.trim() ||
        `Download free ${matTitle.trim()} (${matSectionName}) for ${resolvedChapName || resolvedSubName} on Prepskm.`
      ).slice(0, 300);

      await saveMaterial(
        {
          id: editingMaterialId ?? makeSafeDocId('mat'),
          title: matTitle.trim(),
          slug: cleanSlug,
          seoSlug: cleanSlug,
          seoDescription: autoSeoDesc,
          isPublished: true,
          subjectId: matSubId || subjects[0]?.id || 'subj-physics',
          chapterId: targetChapId,
          sectionName: matSectionName,
          resourceType: matSectionName,
          mediaType: matMediaType,
          cohorts: matCohorts.length > 0 ? matCohorts : allCohortIds,
          fileUrl: finalFileUrl,
          thumbnailUrl: finalThumbUrl || undefined,
          storagePath,
          fileName,
          fileSizeBytes,
          mimeType,
          durationMinutes: matMediaType === 'video' ? matDuration : undefined,
          attachments: matAttachments.length > 0 ? matAttachments : undefined,
          seoKeywords: matSeoKeywords.trim() || undefined,
          description: matDesc.trim() || undefined,
          uploadedBy: firebaseUser?.uid,
        },
        Boolean(editingMaterialId)
      );

      playSuccess();
      setFeedback({
        type: 'ok',
        text: editingMaterialId
          ? `Updated "${matTitle.trim()}" instantly!`
          : `Published "${matTitle.trim()}" instantly inside ${matSectionName}!`,
      });
      resetMaterialForm();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save material.',
      });
    } finally {
      setUploadingMat(false);
    }
  };

  // =====================================
  // INSTANT VIDEO LECTURE PUBLISH & EDIT
  // =====================================
  const resetLectureForm = () => {
    setEditingLectureId(null);
    setLecTitle('');
    setLecUrl('');
    setLecThumbUrl('');
    setLecDesc('');
    setLecFile(null);
    setLecThumbFile(null);
    setLecNum(lectures.length + 1);
  };

  const handleLoadLectureForEdit = (l: VideoLectureRecord) => {
    setEditingLectureId(l.id);
    setLecTitle(l.title);
    setLecSubId(l.subjectId);
    setLecChapId(l.chapterId);
    setLecNum(l.lectureNumber);
    setLecDuration(l.durationMinutes);
    setLecUrl(l.videoUrl);
    setLecThumbUrl(l.thumbnailUrl ?? '');
    setLecDesc(l.description ?? '');
    setLecFile(null);
    setLecThumbFile(null);
    playClick();
  };

  const handleSaveLecture = async () => {
    if (!lecTitle.trim()) {
      setFeedback({ type: 'err', text: 'Enter a lecture title.' });
      return;
    }
    if (!lecUrl.trim() && !lecFile) {
      setFeedback({ type: 'err', text: 'Provide a YouTube/MP4 URL or select a video file.' });
      return;
    }

    setUploadingLec(true);
    setFeedback(null);
    try {
      let finalVideoUrl = lecUrl.trim();
      let storagePath: string | undefined;
      if (lecFile) {
        const res = await uploadPlatformFile({
          folder: 'lectures',
          file: lecFile,
          kind: 'video',
          onProgress: setUploadPct,
        });
        finalVideoUrl = res.downloadUrl;
        storagePath = res.storagePath || undefined;
      }

      let finalThumbUrl = lecThumbUrl.trim();
      if (lecThumbFile) {
        const thumbRes = await uploadPlatformFile({
          folder: 'thumbnails',
          file: lecThumbFile,
          kind: 'thumbnail',
        });
        finalThumbUrl = thumbRes.downloadUrl;
      }

      await saveLecture(
        {
          id: editingLectureId ?? makeSafeDocId('lec'),
          title: lecTitle.trim(),
          subjectId: lecSubId || subjects[0]?.id || 'subj-physics',
          chapterId: lecChapId || chapters[0]?.id || 'chap-phy-electrostatics',
          lectureNumber: lecNum,
          cohorts: allCohortIds,
          videoUrl: finalVideoUrl,
          thumbnailUrl: finalThumbUrl || undefined,
          description: lecDesc.trim() || undefined,
          seoSlug: createSeoSlug(lecTitle.trim()),
          storagePath,
          durationMinutes: lecDuration,
        },
        Boolean(editingLectureId)
      );

      playSuccess();
      setFeedback({
        type: 'ok',
        text: editingLectureId
          ? `Updated video lecture "${lecTitle.trim()}".`
          : `Published video lecture "${lecTitle.trim()}" instantly to /lectures.`,
      });
      resetLectureForm();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to publish lecture.' });
    } finally {
      setUploadingLec(false);
    }
  };

  const handleSaveIq = async () => {
    setSavingIq(true);
    setFeedback(null);
    try {
      await saveIqSettings(iqDraft);
      playSuccess();
      setFeedback({ type: 'ok', text: 'IQ Score pace thresholds & weights saved to Firestore.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save IQ settings.' });
    } finally {
      setSavingIq(false);
    }
  };

  return (
    <PageLayout>
      <SeoHead
        title="Admin Console — PREPSKM.IN"
        description="Faculty & Administrator Content Management System for PREPSKM.IN."
        canonicalPath="/admin"
        noIndex
      />

      <ResponsiveContainer size="wide" className="py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Verified Admin · {firebaseUser?.email}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
              PREPSKM.IN Admin Console
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReusableButton
              variant="secondary"
              size="sm"
              disabled={syncingJee}
              onClick={() => void handleSyncJeeNotes()}
            >
              <Database className="w-4 h-4 text-[#2563EB]" />
              {syncingJee ? 'Syncing 82 JEE Notes...' : 'Sync 82 JEE Concise Notes to Firestore'}
            </ReusableButton>
            {isUsingStarterCatalog && (
              <ReusableButton
                variant="accent"
                size="sm"
                disabled={seeding}
                onClick={() => void handleSeedStarter()}
              >
                <Database className="w-4 h-4" />
                {seeding ? 'Syncing Starter Data...' : 'Seed Starter Curriculum'}
              </ReusableButton>
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-2 ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setFeedback(null)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <Sidebar
            title="Admin Workspaces"
            subtitle="Live Firestore CMS"
            items={ADMIN_SECTIONS}
            activeId={activeTab}
            onSelect={(id) => {
              playClick();
              setActiveTab(id);
            }}
          />

          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* WORKSPACE 0: DYNAMIC CLASSES & SUB-CLASSES */}
            {activeTab === 'classes' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left: Class Groups List */}
                <ReusableCard className="xl:col-span-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#2563EB]" />
                    <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                      Classes ({classGroups.length})
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Students click a Class (e.g. Class 11) to see its nested Sub-Classes (Board, JEE, NEET). Add, rename, or remove Classes below.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New Class (e.g. Class 11, Droppers)"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <ReusableButton variant="primary" size="sm" onClick={() => void handleAddClassGroup()}>
                      <Plus className="w-4 h-4" />
                      Add
                    </ReusableButton>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {classGroups.map((g) => {
                      const isSelected = activeParentGroup?.id === g.id;
                      const isEditingName = editingGroupId === g.id;
                      return (
                        <div
                          key={g.id}
                          className={`py-2.5 px-2 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                            isSelected ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          {isEditingName ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editGroupName}
                                onChange={(e) => setEditGroupName(e.target.value)}
                                className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                              />
                              <ReusableButton
                                variant="primary"
                                size="sm"
                                onClick={() => void handleRenameClassGroup(g)}
                              >
                                Save
                              </ReusableButton>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSubParentId(g.id);
                                resetSubClassForm();
                              }}
                              className="flex-1 text-left"
                            >
                              <p className="text-sm font-bold text-[#0B1B3B] dark:text-white">
                                {g.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {g.subClasses.map((s) => s.shortLabel).join(' · ')}
                              </p>
                            </button>
                          )}

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-label={`Rename ${g.name}`}
                              onClick={() => {
                                setEditingGroupId(g.id);
                                setEditGroupName(g.name);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${g.name}`}
                              onClick={() => void deleteClassGroupDoc(g.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ReusableCard>

                {/* Right: Nested Sub-Classes Editor */}
                <ReusableCard className="xl:col-span-7 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                        Nested Sub-Classes
                      </p>
                      <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                        {activeParentGroup
                          ? `${activeParentGroup.name} → Sub-Classes (${activeParentGroup.subClasses.length})`
                          : 'Select a Class'}
                      </h2>
                    </div>
                    {editingSubId && (
                      <ReusableButton variant="ghost" size="sm" onClick={resetSubClassForm}>
                        Cancel Edit
                      </ReusableButton>
                    )}
                  </div>

                  {activeParentGroup && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          placeholder="Full Label (e.g. Class 11 — NEET UG)"
                          value={subLabel}
                          onChange={(e) => setSubLabel(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Button Label (e.g. Board, JEE, NEET)"
                          value={subShortLabel}
                          onChange={(e) => setSubShortLabel(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Stream Subtitle (e.g. Medical Entrance Track)"
                          value={subStream}
                          onChange={(e) => setSubStream(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Subjects (comma-separated: Physics, Chemistry, Biology)"
                          value={subSubjectsText}
                          onChange={(e) => setSubSubjectsText(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Short Focus Summary"
                          value={subFocusSummary}
                          onChange={(e) => setSubFocusSummary(e.target.value)}
                          className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                        <div className="sm:col-span-2">
                          <ReusableButton
                            variant="accent"
                            size="sm"
                            onClick={() => void handleSaveSubClass()}
                          >
                            {editingSubId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingSubId ? 'Update Sub-Class' : `Add Sub-Class to ${activeParentGroup.name}`}
                          </ReusableButton>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeParentGroup.subClasses.map((sub) => (
                          <div key={sub.id} className="py-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-[#0B1B3B] dark:text-white">
                                {sub.shortLabel}{' '}
                                <span className="text-xs font-normal text-slate-500">
                                  ({sub.label})
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {sub.stream} · {sub.subjects.join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                aria-label={`Edit ${sub.label}`}
                                onClick={() => handleLoadSubClassForEdit(sub)}
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${sub.label}`}
                                onClick={() => void handleDeleteSubClass(activeParentGroup, sub.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </ReusableCard>
              </div>
            )}

            {/* WORKSPACE 1: SUBJECTS & SCOPED SECTIONS */}
            {activeTab === 'subjects' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ReusableCard className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                      Dynamic Subjects ({subjects.length})
                    </h2>
                    {editingSubjectId && (
                      <ReusableButton variant="ghost" size="sm" onClick={resetSubjectForm}>
                        Cancel Edit
                      </ReusableButton>
                    )}
                  </div>
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Subject Name (e.g. Biology, Accounts, CS)"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Code (BIO)"
                        value={newSubCode}
                        onChange={(e) => setNewSubCode(e.target.value)}
                        className="w-28 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono uppercase"
                      />
                      <ReusableButton variant="primary" size="sm" onClick={() => void handleAddSubject()}>
                        {editingSubjectId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingSubjectId ? 'Update' : 'Add'}
                      </ReusableButton>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Visible ONLY in Selected Classes / Sub-Classes ({newSubCohorts.length} selected)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allCohorts.map((c) => {
                          const checked = newSubCohorts.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                setNewSubCohorts((prev) =>
                                  prev.includes(c.id)
                                    ? prev.filter((id) => id !== c.id)
                                    : [...prev, c.id]
                                )
                              }
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                checked
                                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {c.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                    {subjects.map((sub, idx) => (
                      <div key={sub.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{sub.name}</p>
                          <p className="text-xs font-mono text-slate-500 truncate">
                            {sub.code} · {sub.cohorts.length} sub-class(es)
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Edit ${sub.name}`}
                            onClick={() => handleLoadSubjectForEdit(sub)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${sub.name} up`}
                            disabled={idx === 0}
                            onClick={() => void handleReorderSubject(idx, -1)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${sub.name} down`}
                            disabled={idx === subjects.length - 1}
                            onClick={() => void handleReorderSubject(idx, 1)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${sub.name}`}
                            onClick={() => void deleteSubjectDoc(sub.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ReusableCard>

                {/* Scoped Chapter Sections Manager */}
                <ReusableCard className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#2563EB]" />
                      Chapter Sections ({sections.length})
                    </h2>
                    {editingSectionId && (
                      <ReusableButton variant="ghost" size="sm" onClick={resetSectionForm}>
                        Cancel Edit
                      </ReusableButton>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sections appear inside Chapters on /materials. Apply a section to All Subjects, multiple selected Subjects, or specific Chapters.
                  </p>

                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Section Name (e.g. Short Notes, NCERT Diagrams, Video Lectures)"
                      value={secName}
                      onChange={(e) => setSecName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Short Description (optional)"
                      value={secDesc}
                      onChange={(e) => setSecDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />

                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Apply Section Scope
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { id: 'all', label: 'All Subjects' },
                            { id: 'subjects', label: 'Multi-Subjects' },
                            { id: 'chapters', label: 'Specific Chapters' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSecScope(opt.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                              secScope === opt.id
                                ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {secScope === 'subjects' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {subjects.map((sub) => {
                          const checked = secSubjectIds.includes(sub.id);
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() =>
                                setSecSubjectIds((prev) =>
                                  prev.includes(sub.id)
                                    ? prev.filter((id) => id !== sub.id)
                                    : [...prev, sub.id]
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                checked
                                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {secScope === 'chapters' && (
                      <div className="max-h-36 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
                        {chapters.map((ch) => {
                          const checked = secChapterIds.includes(ch.id);
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() =>
                                setSecChapterIds((prev) =>
                                  prev.includes(ch.id)
                                    ? prev.filter((id) => id !== ch.id)
                                    : [...prev, ch.id]
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                checked
                                  ? 'bg-[#F97316] text-white border-[#F97316]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {ch.name}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <ReusableButton variant="primary" size="sm" onClick={() => void handleSaveSection()}>
                      {editingSectionId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingSectionId ? 'Update Section' : 'Create Section'}
                    </ReusableButton>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {sections.map((sec) => {
                      const scopeLabel =
                        sec.scope === 'subjects'
                          ? `Subjects (${sec.subjectIds?.length ?? 0})`
                          : sec.scope === 'chapters'
                            ? `Chapters (${sec.chapterIds?.length ?? 0})`
                            : 'All Subjects';
                      return (
                        <div key={sec.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {sec.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Scope: <strong className="text-[#2563EB] dark:text-sky-400">{scopeLabel}</strong> · /{sec.slug}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-label={`Edit section ${sec.name}`}
                              onClick={() => handleLoadSectionForEdit(sec)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${sec.name}`}
                              onClick={() => void deleteSectionDoc(sec.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ReusableCard>
              </div>
            )}

            {/* WORKSPACE 2: CHAPTER MANAGER */}
            {activeTab === 'chapters' && (
              <ReusableCard className="space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                    Chapter Manager ({chapters.length})
                  </h2>
                  {editingChapterId && (
                    <ReusableButton variant="ghost" size="sm" onClick={resetChapterForm}>
                      Cancel Edit
                    </ReusableButton>
                  )}
                </div>

                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <select
                      aria-label="Chapter subject"
                      value={chapSubId}
                      onChange={(e) => setChapSubId(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Chapter Name"
                      value={chapName}
                      onChange={(e) => setChapName(e.target.value)}
                      className="lg:col-span-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <select
                      aria-label="Chapter difficulty"
                      value={chapDifficulty}
                      onChange={(e) => setChapDifficulty(e.target.value as ChapterDifficulty)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Tough">Tough</option>
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        aria-label="Weightage marks"
                        min={0}
                        max={40}
                        value={chapWeightage}
                        onChange={(e) => setChapWeightage(Number(e.target.value) || 4)}
                        className="w-20 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                      />
                      <ReusableButton variant="primary" size="sm" onClick={() => void handleAddChapter()}>
                        {editingChapterId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingChapterId ? 'Save' : 'Add'}
                      </ReusableButton>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Assign Chapter ONLY to Selected Classes / Sub-Classes ({chapCohorts.length} selected)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allCohorts.map((c) => {
                        const checked = chapCohorts.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setChapCohorts((prev) =>
                                prev.includes(c.id)
                                  ? prev.filter((id) => id !== c.id)
                                  : [...prev, c.id]
                              )
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              checked
                                ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {c.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                  {chapters.map((ch) => (
                    <div key={ch.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ch.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {subjects.find((s) => s.id === ch.subjectId)?.name ?? ch.subjectId} ·{' '}
                          {ch.weightageMarks} Marks · {ch.difficulty} ·{' '}
                          {ch.cohorts
                            .map((cid) => allCohorts.find((c) => c.id === cid)?.shortLabel ?? cid)
                            .slice(0, 3)
                            .join(', ')}
                          {ch.cohorts.length > 3 ? ` +${ch.cohorts.length - 3}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Edit ${ch.name}`}
                          onClick={() => handleLoadChapterForEdit(ch)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${ch.name}`}
                          onClick={() => void deleteChapterDoc(ch.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ReusableCard>
            )}

            {/* WORKSPACE 3: INSTANT MATERIALS (PDF & VIDEO + THUMBNAILS + EDIT/DELETE) */}
            {activeTab === 'uploads' && (
              <div className="space-y-6">
                <ReusableCard className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                        <FileUp className="w-5 h-5 text-[#F97316]" />
                        {editingMaterialId
                          ? 'Edit Chapter Material / Video'
                          : 'Instant Chapter Material & Video Upload'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Instant zero-hang uploads for PDFs, Images, and Videos (with Video Thumbnail, Title, Description, and SEO Slug).
                      </p>
                    </div>
                    {editingMaterialId && (
                      <ReusableButton variant="ghost" size="sm" onClick={resetMaterialForm}>
                        Cancel Edit
                      </ReusableButton>
                    )}
                  </div>

                  {/* Media Type Selector */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'pdf', label: 'PDF / Document' },
                        { id: 'video', label: 'Video + Thumbnail' },
                        { id: 'image', label: 'Formula Image / Mind Map' },
                        { id: 'link', label: 'External Resource URL' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMatMediaType(m.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          matMediaType === m.id
                            ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Upload File from Device (Instant)
                      </label>
                      <input
                        ref={matFileInputRef}
                        type="file"
                        accept={
                          matMediaType === 'video'
                            ? 'video/mp4,video/webm,video/*'
                            : matMediaType === 'image'
                              ? 'image/*'
                              : '.pdf,image/*,.doc,.docx,.ppt,.pptx'
                        }
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setMatFile(f);
                          if (f && !matTitle.trim()) {
                            const autoTitle = extractTitleFromFilename(f.name);
                            setMatTitle(autoTitle);
                            setMatSeoSlug(createSeoSlug(autoTitle));
                          }
                        }}
                        className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0B1B3B] file:text-white hover:file:bg-[#193268]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Or Paste Direct / YouTube URL
                      </label>
                      <input
                        type="url"
                        placeholder={
                          matMediaType === 'video'
                            ? 'https://www.youtube.com/watch?v=... or MP4 URL'
                            : 'https://... PDF or Resource URL'
                        }
                        value={matFileUrl}
                        onChange={(e) => setMatFileUrl(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                      />
                    </div>

                    {/* Video Thumbnail Upload / URL */}
                    {(matMediaType === 'video' || matThumbUrl || matThumbFile) && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-[#F97316]" />
                            Upload Video Thumbnail Image (Instant)
                          </label>
                          <input
                            ref={matThumbInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => setMatThumbFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#F97316] file:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Or Thumbnail URL & Duration (min)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="https://... thumbnail image URL"
                              value={matThumbUrl}
                              onChange={(e) => setMatThumbUrl(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                            />
                            <input
                              type="number"
                              min={1}
                              aria-label="Video duration minutes"
                              value={matDuration}
                              onChange={(e) => setMatDuration(Number(e.target.value) || 15)}
                              className="w-20 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <input
                      type="text"
                      placeholder="Resource Title (e.g. Electrostatics Formula Sheet)"
                      value={matTitle}
                      onChange={(e) => {
                        setMatTitle(e.target.value);
                        if (!editingMaterialId) setMatSeoSlug(createSeoSlug(e.target.value));
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />

                    <select
                      aria-label="Target Chapter Section"
                      value={matSectionName}
                      onChange={(e) => setMatSectionName(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      {sections.map((s) => (
                        <option key={s.id} value={s.name}>
                          Section: {s.name}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Material Subject"
                      value={matSubId}
                      onChange={(e) => {
                        const nextSub = e.target.value;
                        setMatSubId(nextSub);
                        const firstCh = chapters.find((c) => c.subjectId === nextSub);
                        if (firstCh) setMatChapId(firstCh.id);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Material Chapter"
                      value={matChapId}
                      onChange={(e) => setMatChapId(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      {matAvailableChapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <textarea
                      rows={2}
                      placeholder="Detailed description (helps students & boosts Google SEO)"
                      value={matDesc}
                      onChange={(e) => setMatDesc(e.target.value)}
                      className="md:col-span-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />

                    <input
                      type="text"
                      placeholder="SEO URL Slug (auto-generated)"
                      value={matSeoSlug}
                      onChange={(e) => setMatSeoSlug(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />

                    <input
                      type="text"
                      placeholder="SEO Keywords (e.g. JEE Physics, Electrostatics Notes)"
                      value={matSeoKeywords}
                      onChange={(e) => setMatSeoKeywords(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  {/* Dynamic Sub-Classes Tag Selector */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Visible to Sub-Classes / Tracks
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allCohorts.map((c) => {
                        const active = matCohorts.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setMatCohorts((prev) =>
                                prev.includes(c.id)
                                  ? prev.filter((id) => id !== c.id)
                                  : [...prev, c.id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              active
                                ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {c.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attach / Tag Downloadable PDFs or Files to Video */}
                  {(matMediaType === 'video' || matAttachments.length > 0) && (
                    <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/70 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-[#F97316]" />
                          Tag / Attach PDFs or Files to This Video ({matAttachments.length}/10)
                        </p>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Videos stay stream-only; attached PDFs get Download buttons
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Attachment label (e.g. Lecture Slides PDF)"
                          value={attTitle}
                          onChange={(e) => setAttTitle(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            placeholder="Paste PDF / File URL"
                            value={attUrl}
                            onChange={(e) => setAttUrl(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          <ReusableButton
                            variant="secondary"
                            size="sm"
                            onClick={handleAddAttachmentUrl}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Tag
                          </ReusableButton>
                        </div>
                        <input
                          ref={attFileInputRef}
                          type="file"
                          accept=".pdf,image/*,.doc,.docx,.ppt,.pptx"
                          disabled={attUploading}
                          onChange={(e) => void handleAddAttachmentFile(e.target.files?.[0] ?? null)}
                          className="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2563EB] file:text-white"
                        />
                      </div>

                      {matAttachments.length > 0 && (
                        <div className="space-y-1.5">
                          {matAttachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                            >
                              <span className="font-semibold text-[#0B1B3B] dark:text-slate-200 truncate">
                                {att.title}{' '}
                                <span className="font-normal text-slate-400">
                                  ({att.fileName || 'PDF'})
                                </span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Remove attachment ${att.title}`}
                                onClick={() =>
                                  setMatAttachments((prev) => prev.filter((x) => x.id !== att.id))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {uploadingMat && (
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-[#10B981] transition-all"
                          style={{ width: `${uploadPct}%` }}
                        />
                      </div>
                      <p className="text-xs font-mono text-slate-500">Publishing... {uploadPct}%</p>
                    </div>
                  )}

                  <ReusableButton
                    variant="accent"
                    size="sm"
                    disabled={uploadingMat}
                    onClick={() => void handleSaveMaterial()}
                  >
                    {editingMaterialId ? <Save className="w-4 h-4" /> : <FileUp className="w-4 h-4" />}
                    {uploadingMat
                      ? `Saving (${uploadPct}%)`
                      : editingMaterialId
                        ? 'Save Material Changes'
                        : 'Publish Resource Instantly'}
                  </ReusableButton>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {materials.map((m) => (
                      <div key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-3">
                          {m.thumbnailUrl && (
                            <img
                              src={m.thumbnailUrl}
                              alt=""
                              className="w-12 h-8 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {m.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {m.sectionName || m.resourceType} · {(m.mediaType ?? 'pdf').toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Edit ${m.title}`}
                            onClick={() => handleLoadMaterialForEdit(m)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${m.title}`}
                            onClick={() => void deleteMaterialDoc(m)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ReusableCard>

                {/* Video Lecture Publisher with Thumbnails & Edit/Delete */}
                <ReusableCard className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                      <Video className="w-5 h-5 text-[#2563EB]" />
                      {editingLectureId
                        ? 'Edit Video Lecture'
                        : `Course Video Lecture Manager (${lectures.length})`}
                    </h2>
                    {editingLectureId && (
                      <ReusableButton variant="ghost" size="sm" onClick={resetLectureForm}>
                        Cancel Edit
                      </ReusableButton>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Lecture Title"
                      value={lecTitle}
                      onChange={(e) => setLecTitle(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <input
                      type="url"
                      placeholder="YouTube or MP4 URL (or select video file below)"
                      value={lecUrl}
                      onChange={(e) => setLecUrl(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <select
                      aria-label="Lecture Subject"
                      value={lecSubId}
                      onChange={(e) => setLecSubId(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Lecture #"
                        value={lecNum}
                        onChange={(e) => setLecNum(Number(e.target.value) || 1)}
                        className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Minutes"
                        value={lecDuration}
                        onChange={(e) => setLecDuration(Number(e.target.value) || 30)}
                        className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                      />
                    </div>
                    <input
                      type="url"
                      placeholder="Thumbnail Image URL (optional)"
                      value={lecThumbUrl}
                      onChange={(e) => setLecThumbUrl(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Upload lecture thumbnail"
                      onChange={(e) => setLecThumbFile(e.target.files?.[0] ?? null)}
                      className="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F97316] file:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Lecture description (optional)"
                      value={lecDesc}
                      onChange={(e) => setLecDesc(e.target.value)}
                      className="md:col-span-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setLecFile(f);
                        if (f && !lecTitle.trim()) setLecTitle(extractTitleFromFilename(f.name));
                      }}
                      className="md:col-span-2 text-xs text-slate-600 dark:text-slate-300"
                    />
                  </div>
                  <ReusableButton
                    variant="primary"
                    size="sm"
                    disabled={uploadingLec}
                    onClick={() => void handleSaveLecture()}
                  >
                    {editingLectureId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {uploadingLec
                      ? 'Publishing Video...'
                      : editingLectureId
                        ? 'Save Lecture Changes'
                        : 'Publish Video Lecture'}
                  </ReusableButton>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                    {lectures.map((l) => (
                      <div key={l.id} className="py-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          L{l.lectureNumber}. {l.title} ({l.durationMinutes}m)
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Edit lecture ${l.title}`}
                            onClick={() => handleLoadLectureForEdit(l)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete lecture ${l.title}`}
                            onClick={() => void deleteLectureDoc(l)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ReusableCard>
              </div>
            )}

            {/* WORKSPACE AI-1: PDF-TO-QUESTION AI EXTRACTOR */}
            {activeTab === 'ai-extractor' && <PdfQuestionExtractorPanel />}

            {/* WORKSPACE AI-2: DIRECT CHAT SUPPORT & FEATURE INBOX */}
            {activeTab === 'support-inbox' && <SupportInboxPanel />}

            {/* WORKSPACE 4: QUESTION PAPER CROPPER & CBT/DPP BUILDER */}
            {activeTab === 'tests' && <QuestionPaperBuilder />}

            {/* WORKSPACE 5: IQ SCORE THRESHOLDS & WEIGHTS */}
            {activeTab === 'iq' && (
              <ReusableCard className="space-y-4 max-w-2xl">
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  IQ Score & Pace Heuristic Configuration
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure the transparent timing windows and weighting factors used to compute the separate IQ Score (40–150) on student analytics. Official exam scores are never altered.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'tooFastThresholdSec', label: 'Too Fast Threshold (sec)' },
                    { key: 'optimalMinSec', label: 'Optimal Pace Min (sec)' },
                    { key: 'optimalMaxSec', label: 'Optimal Pace Max (sec)' },
                    { key: 'tooSlowThresholdSec', label: 'Too Slow Threshold (sec)' },
                    { key: 'rushingPenaltyWeight', label: 'Rushing Penalty Weight' },
                    { key: 'slowPenaltyWeight', label: 'Slow Pace Penalty Weight' },
                    { key: 'optimalBonusWeight', label: 'Optimal Pace Bonus Weight' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label htmlFor={`iq-${key}`} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {label}
                      </label>
                      <input
                        id={`iq-${key}`}
                        type="number"
                        step="0.5"
                        value={iqDraft[key as keyof IQConfig] as number}
                        onChange={(e) =>
                          setIqDraft((prev) => ({
                            ...prev,
                            [key]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>

                <ReusableButton
                  variant="primary"
                  size="sm"
                  disabled={savingIq}
                  onClick={() => void handleSaveIq()}
                >
                  <Save className="w-4 h-4" />
                  {savingIq ? 'Saving Settings...' : 'Save IQ Score Settings'}
                </ReusableButton>
              </ReusableCard>
            )}
          </div>
        </div>
      </ResponsiveContainer>
    </PageLayout>
  );
}
