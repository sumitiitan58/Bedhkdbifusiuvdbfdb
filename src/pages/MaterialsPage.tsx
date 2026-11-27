import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Paperclip,
  Play,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { FullPageMediaReader } from '../components/materials/FullPageMediaReader';
import { CbtExamRunner } from '../components/exam/CbtExamRunner';
import { DppGeneratorPanel } from '../components/dpp/DppGeneratorPanel';
import { AttemptReviewModal } from '../components/analytics/AttemptReviewModal';
import { NativeBannerAd } from '../components/ads/NativeBannerAd';
import { GuestDownloadBadge } from '../components/monetization/GuestDownloadBadge';
import { useAuth } from '../context/AuthContext';
import { useDownloadGate } from '../context/DownloadGateContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { resolveAssetUrl } from '../utils/instantUpload';
import {
  filterChaptersByCohort,
  filterMaterialsByCohort,
  filterSubjectsByCohort,
  getTestCohortIds,
  testMatchesCohort,
} from '../utils/catalogMerge';
import {
  CHAPTER_RESOURCE_TABS,
  computeChapterBucketCounts,
  groupChapterMaterialsByTab,
  type ChapterResourceTabId,
} from '../utils/studyHierarchy';
import {
  CANONICAL_ORIGIN,
  generateCleanSlug,
  getHierarchicalMaterialPath,
  getHierarchicalMockTestPath,
  resolveSubjectSlug,
  stripChapterNumberPrefix,
} from '../utils/seoHelpers';
import { playClick } from '../utils/soundEffects';
import type {
  MockTestRecord,
  StudentCohortId,
  StudyMaterialRecord,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../types';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'PDF';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1) || null;
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || null;
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

function isVideoMaterial(mat: StudyMaterialRecord): boolean {
  if (mat.mediaType === 'video') return true;
  if (mat.mimeType?.startsWith('video/')) return true;
  if (extractYouTubeId(mat.fileUrl)) return true;
  return /\.(mp4|webm|mov)(\?|$)/i.test(mat.fileUrl);
}

const TAB_ICONS: Record<ChapterResourceTabId, typeof FileText> = {
  'short-notes': FileText,
  'formula-sheets': FileSpreadsheet,
  'mind-maps': Layers,
  'chapter-pyqs': Sparkles,
};

type ChapterWorkspaceTabId = ChapterResourceTabId | 'chapter-dpps';

export default function MaterialsPage() {
  const { cohortId } = useAuth();
  const { requestPdfDownload } = useDownloadGate();
  const {
    allCohorts,
    subjects,
    chapters,
    materials,
    mockTests,
    questions,
    attempts,
    progress,
    toggleMaterialBookmark,
    recordMaterialView,
  } = usePlatformData();

  const [searchParams, setSearchParams] = useSearchParams();
  const trackParam = searchParams.get('track');
  const queryParam = searchParams.get('q');
  const tabParam = searchParams.get('tab');

  const [libraryMode, setLibraryMode] = useState<'chapters' | 'dpps'>(
    tabParam === 'dpp' ? 'dpps' : 'chapters'
  );
  const [selectedCohort, setSelectedCohort] = useState<StudentCohortId | 'all'>(
    trackParam || cohortId || 'class-12-jee'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ChapterWorkspaceTabId>('short-notes');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const [activeDpp, setActiveDpp] = useState<MockTestRecord | null>(null);
  const [customDppQuestions, setCustomDppQuestions] = useState<TestQuestionRecord[] | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<TestAttemptRecord | null>(null);

  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterialRecord | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (tabParam === 'dpp') {
      setLibraryMode('dpps');
      setActiveChapterId(null);
    } else if (tabParam === 'chapters') {
      setLibraryMode('chapters');
    }
  }, [tabParam]);

  useEffect(() => {
    if (trackParam) {
      setSelectedCohort(trackParam);
      setActiveChapterId(null);
    } else if (cohortId) {
      setSelectedCohort(cohortId);
      setActiveChapterId(null);
    }
  }, [trackParam, cohortId]);

  useEffect(() => {
    if (queryParam !== null) {
      setSearchQuery(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    let active = true;
    if (!previewMaterial) {
      setResolvedPreviewUrl('');
      return;
    }
    resolveAssetUrl(previewMaterial.fileUrl).then((url) => {
      if (active) setResolvedPreviewUrl(url || previewMaterial.fileUrl);
    });
    return () => {
      active = false;
    };
  }, [previewMaterial]);

  const visibleSubjects = useMemo(
    () => filterSubjectsByCohort(subjects, selectedCohort),
    [subjects, selectedCohort]
  );

  // Default to the first Subject Tab in Chapter Library mode; allow 'all' in Inline Chapter DPPs mode
  useEffect(() => {
    if (visibleSubjects.length === 0) return;
    if (libraryMode === 'dpps' && selectedSubjectId === 'all') return;
    if (!selectedSubjectId || !visibleSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(libraryMode === 'dpps' ? 'all' : visibleSubjects[0].id);
    }
  }, [libraryMode, selectedSubjectId, visibleSubjects]);

  const cohortMaterials = useMemo(
    () => filterMaterialsByCohort(materials, selectedCohort),
    [materials, selectedCohort]
  );

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );
  const bookmarkSet = useMemo(
    () => new Set(progress.bookmarkedMaterials),
    [progress.bookmarkedMaterials]
  );

  const cohortChapters = useMemo(
    () =>
      filterChaptersByCohort(chapters, selectedCohort).filter(
        (ch) =>
          !ch.id.includes('-master') &&
          !ch.name.toLowerCase().includes('master formula sheet')
      ),
    [chapters, selectedCohort]
  );

  const chapterCountsMap = useMemo(
    () => computeChapterBucketCounts(cohortChapters, cohortMaterials),
    [cohortChapters, cohortMaterials]
  );

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visibleSubjectIds = new Set(visibleSubjects.map((s) => s.id));
    return cohortChapters
      .filter((ch) => {
        if (selectedCohort !== 'all' && !visibleSubjectIds.has(ch.subjectId)) return false;
        if (selectedSubjectId && ch.subjectId !== selectedSubjectId) return false;
        const chMats = cohortMaterials.filter((m) => m.chapterId === ch.id);
        if (onlyBookmarked && !chMats.some((m) => bookmarkSet.has(m.id))) return false;
        if (q) {
          const subName = (subjectMap.get(ch.subjectId)?.name ?? '').toLowerCase();
          const matchesMaterial = chMats.some(
            (m) =>
              m.title.toLowerCase().includes(q) ||
              (m.description ?? '').toLowerCase().includes(q) ||
              (m.seoKeywords ?? '').toLowerCase().includes(q)
          );
          return ch.name.toLowerCase().includes(q) || subName.includes(q) || matchesMaterial;
        }
        return true;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [
    bookmarkSet,
    cohortChapters,
    cohortMaterials,
    onlyBookmarked,
    searchQuery,
    selectedCohort,
    selectedSubjectId,
    subjectMap,
    visibleSubjects,
  ]);

  const activeChapter = useMemo(
    () => (activeChapterId ? chapters.find((c) => c.id === activeChapterId) ?? null : null),
    [activeChapterId, chapters]
  );

  const groupedChapterMaterials = useMemo(() => {
    if (!activeChapter) {
      return {
        'short-notes': [],
        'formula-sheets': [],
        'mind-maps': [],
        'chapter-pyqs': [],
      } as Record<ChapterResourceTabId, StudyMaterialRecord[]>;
    }
    const scoped = cohortMaterials.filter((m) => {
      if (m.chapterId !== activeChapter.id) return false;
      if (onlyBookmarked && !bookmarkSet.has(m.id)) return false;
      return true;
    });
    return groupChapterMaterialsByTab(scoped);
  }, [activeChapter, bookmarkSet, cohortMaterials, onlyBookmarked]);

  const cohortLabelMap = useMemo(
    () => new Map(allCohorts.map((c) => [c.id, c.shortLabel])),
    [allCohorts]
  );

  const chapterMap = useMemo(
    () => new Map(chapters.map((c) => [c.id, c.name])),
    [chapters]
  );

  const allPublishedDpps = useMemo(
    () => mockTests.filter((t) => t.destination === 'dpp' && t.status === 'published'),
    [mockTests]
  );

  const chapterDppsMap = useMemo(() => {
    const map = new Map<string, MockTestRecord[]>();
    for (const dpp of allPublishedDpps) {
      if (!dpp.chapterId) continue;
      const list = map.get(dpp.chapterId) ?? [];
      list.push(dpp);
      map.set(dpp.chapterId, list);
    }
    return map;
  }, [allPublishedDpps]);

  const cohortDpps = useMemo(
    () =>
      allPublishedDpps.filter((t) =>
        selectedCohort === 'all' ? true : testMatchesCohort(t, selectedCohort)
      ),
    [allPublishedDpps, selectedCohort]
  );

  const publishedDpps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const subjectScoped = cohortDpps.filter((t) => {
      if (libraryMode === 'dpps' && selectedSubjectId && selectedSubjectId !== 'all') {
        if (t.subjectId && t.subjectId !== selectedSubjectId) return false;
      }
      if (q) {
        const subName = ((t.subjectId && subjectMap.get(t.subjectId)?.name) || '').toLowerCase();
        const chName = ((t.chapterId && chapterMap.get(t.chapterId)) || '').toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          subName.includes(q) ||
          chName.includes(q)
        );
      }
      return true;
    });
    return subjectScoped;
  }, [chapterMap, cohortDpps, libraryMode, searchQuery, selectedSubjectId, subjectMap]);

  const activeChapterDpps = useMemo(() => {
    if (!activeChapter) return { items: [] as MockTestRecord[], isExact: true };
    const exact = allPublishedDpps.filter((t) => t.chapterId === activeChapter.id);
    if (exact.length > 0) return { items: exact, isExact: true };
    const bySubject = allPublishedDpps.filter(
      (t) =>
        t.subjectId === activeChapter.subjectId &&
        (selectedCohort === 'all' || testMatchesCohort(t, selectedCohort))
    );
    if (bySubject.length > 0) return { items: bySubject, isExact: false };
    return { items: cohortDpps.slice(0, 6), isExact: false };
  }, [activeChapter, allPublishedDpps, cohortDpps, selectedCohort]);

  const dppAttempts = useMemo(
    () => attempts.filter((a) => a.destination === 'dpp'),
    [attempts]
  );

  const activeDppQuestions = useMemo(() => {
    if (!activeDpp) return [];
    if (customDppQuestions && customDppQuestions.length > 0) return customDppQuestions;
    return questions.filter((q) => q.testId === activeDpp.id);
  }, [activeDpp, customDppQuestions, questions]);

  // Auto-select the first populated tab when opening a chapter
  const handleSelectChapter = (chapterId: string) => {
    playClick();
    setActiveChapterId(chapterId);
    const counts = chapterCountsMap.get(chapterId);
    if (counts) {
      const firstPopulated = CHAPTER_RESOURCE_TABS.find((t) => counts.byTab[t.id] > 0);
      setActiveSubTab(firstPopulated?.id ?? 'short-notes');
    } else {
      setActiveSubTab('short-notes');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPreview = (mat: StudyMaterialRecord) => {
    playClick();
    recordMaterialView(mat.id);
    setPreviewMaterial(mat);
  };

  const handleDownloadDocument = async (
    rawUrl: string,
    suggestedName?: string,
    materialId?: string,
    displayTitle?: string
  ) => {
    await requestPdfDownload({
      url: rawUrl,
      fileName: suggestedName || 'PREPSKM-Notes.pdf',
      title: displayTitle || suggestedName || 'Chapter Notes PDF',
      materialId,
      onApproved: () => {
        if (materialId) recordMaterialView(materialId);
      },
    });
  };

  const handleSwitchMode = (mode: 'chapters' | 'dpps') => {
    playClick();
    setLibraryMode(mode);
    setActiveChapterId(null);
    if (mode === 'dpps') {
      setSelectedSubjectId('all');
    } else if (visibleSubjects.length > 0 && selectedSubjectId === 'all') {
      setSelectedSubjectId(visibleSubjects[0].id);
    }
    const nextParams = new URLSearchParams(searchParams);
    if (mode === 'dpps') nextParams.set('tab', 'dpp');
    else nextParams.delete('tab');
    setSearchParams(nextParams, { replace: true });
  };

  const activeSubjectName = activeChapter
    ? subjectMap.get(activeChapter.subjectId)?.name ?? 'Subject'
    : selectedSubjectId === 'all'
      ? 'All Subjects'
      : subjectMap.get(selectedSubjectId)?.name ?? 'All Subjects';

  const selectedCohortLabel =
    selectedCohort === 'all'
      ? 'JEE & NEET'
      : allCohorts.find((c) => c.id === selectedCohort)?.label ?? selectedCohort;

  const cleanActiveChapterName = activeChapter
    ? stripChapterNumberPrefix(activeChapter.name)
    : '';

  const rawTitle = activeChapter
    ? `${cleanActiveChapterName} Notes & DPPs – ${activeSubjectName} | Prepskm`
    : libraryMode === 'dpps'
      ? `${selectedCohortLabel} Inline Chapter DPPs | Prepskm`
      : `${selectedCohortLabel} Study Materials & DPPs | Prepskm`;
  const seoTitle =
    rawTitle.length <= 60 ? rawTitle : `${rawTitle.slice(0, 49).trim()} | Prepskm`;

  const seoDescription = activeChapter
    ? `Download free ${cleanActiveChapterName} (${activeSubjectName}) notes, formulas, PYQs & launch inline Chapter DPPs for ${selectedCohortLabel} on Prepskm.`.slice(0, 155)
    : `Browse chapter-wise ${selectedCohortLabel} notes, formula sheets, PYQs & solve timed Chapter DPPs directly inline inside Study Materials on PREPSKM.IN.`.slice(0, 155);

  const materialsJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: seoTitle,
          description: seoDescription,
          url: `${CANONICAL_ORIGIN}/materials`,
          inLanguage: 'en-IN',
          provider: {
            '@type': 'EducationalOrganization',
            name: 'Prepskm',
            url: CANONICAL_ORIGIN,
          },
        },
      ],
    }),
    [seoDescription, seoTitle]
  );

  const activeYoutubeId =
    previewMaterial && isVideoMaterial(previewMaterial)
      ? extractYouTubeId(previewMaterial.fileUrl)
      : null;

  const currentTabItems =
    activeSubTab === 'chapter-dpps' ? [] : (groupedChapterMaterials[activeSubTab] ?? []);

  const renderDppCard = (dpp: MockTestRecord, contextNote?: string) => {
    const qCount = questions.filter((q) => q.testId === dpp.id).length;
    const prevAttempts = dppAttempts.filter((a) => a.testId === dpp.id);
    const latest = prevAttempts[prevAttempts.length - 1];
    const subName =
      (dpp.subjectId && subjectMap.get(dpp.subjectId)?.name) ||
      dpp.syllabus?.[0]?.subject ||
      dpp.examCategory;
    const chName =
      (dpp.chapterId && chapterMap.get(dpp.chapterId)) ||
      dpp.syllabus?.[0]?.chapters?.[0] ||
      'Chapter Practice';
    const targetCohortText = getTestCohortIds(dpp)
      .map((cid) => cohortLabelMap.get(cid) ?? cid)
      .join(' · ');

    return (
      <ReusableCard
        key={dpp.id}
        interactive
        padding="sm"
        className="flex flex-col justify-between gap-3.5"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-[#2563EB] dark:text-sky-400 shrink-0">
              {subName}
              {contextNote ? ` · ${contextNote}` : ''}
            </span>
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[60%] text-right">
              {stripChapterNumberPrefix(chName)}
            </span>
          </div>

          <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white leading-snug">
            <Link
              to={getHierarchicalMockTestPath(dpp)}
              className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
            >
              {dpp.title}
            </Link>
          </h2>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            <span>{qCount || dpp.totalQuestions} Qs</span>
            <span aria-hidden="true">·</span>
            <span>{dpp.durationMinutes} min</span>
            <span aria-hidden="true">·</span>
            <span>
              {dpp.negativeMarkingEnabled
                ? `+${dpp.positiveMarks} / -${dpp.negativeMarks}`
                : `+${dpp.positiveMarks} (No Neg)`}
            </span>
            {targetCohortText && (
              <>
                <span aria-hidden="true">·</span>
                <span>{targetCohortText}</span>
              </>
            )}
          </div>

          {latest && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 pt-0.5 tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Latest: {latest.score}/{latest.maxScore} ({latest.accuracyPercent}%) ·{' '}
              {prevAttempts.length} attempt(s)
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {latest && (
            <ReusableButton
              variant="secondary"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => {
                playClick();
                setReviewAttempt(latest);
              }}
            >
              <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
              Solutions
            </ReusableButton>
          )}
          <ReusableButton
            variant={latest ? 'accent' : 'primary'}
            size="sm"
            className="flex-1 whitespace-nowrap"
            onClick={() => {
              playClick();
              setActiveDpp(dpp);
            }}
          >
            {latest ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {latest ? 'Reattempt Inline' : 'Solve DPP Inline'}
          </ReusableButton>
        </div>
      </ReusableCard>
    );
  };

  if (activeDpp) {
    return (
      <PageLayout hideFooter>
        <SeoHead
          title={`${activeDpp.title} — Inline Chapter DPP | Prepskm`}
          description={`Timed inline Chapter DPP exam session for ${activeDpp.title} inside Study Materials on PREPSKM.IN.`}
          canonicalPath="/materials"
        />
        <ResponsiveContainer size="wide" className="py-6">
          <CbtExamRunner
            test={activeDpp}
            questions={activeDppQuestions}
            onExit={() => {
              setActiveDpp(null);
              setCustomDppQuestions(null);
            }}
          />
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        canonicalPath="/materials"
        keywords={
          activeChapter
            ? `${cleanActiveChapterName} short notes, ${cleanActiveChapterName} formula sheet, ${cleanActiveChapterName} DPP, ${activeSubjectName} PYQs, ${selectedCohortLabel}`
            : `chapter wise notes, inline chapter DPPs, ${selectedCohortLabel} study materials, JEE notes, NEET notes, formula sheets, prepskm`
        }
        jsonLd={materialsJsonLd}
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {activeChapter ? (
          /* ================================================================
             CHAPTER DETAIL VIEW — 4 Structured Sub-Tabs (No Flat Dump)
             ================================================================ */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setActiveChapterId(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0B1B3B] dark:text-white bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 hover:border-[#2563EB] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to {activeSubjectName} Chapters
              </button>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                <GuestDownloadBadge />
                <span aria-hidden="true">·</span>
                <span>Weightage: {activeChapter.weightageMarks} Marks</span>
                <span aria-hidden="true">·</span>
                <span>{activeChapter.difficulty}</span>
              </div>
            </div>

            <ReusableCard className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  {activeSubjectName} · {selectedCohortLabel}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                  {stripChapterNumberPrefix(activeChapter.name)}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  All short notes, formula sheets, mind maps, and chapter PYQs for this chapter in one structured workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setOnlyBookmarked((b) => !b);
                  }}
                  aria-pressed={onlyBookmarked}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    onlyBookmarked
                      ? 'bg-[#F97316] text-white border-[#F97316]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#2563EB]'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  Saved Only
                </button>
              </div>
            </ReusableCard>

            {/* 5 Hierarchical Chapter Resource Sub-Tabs (4 Resource Buckets + Inline Chapter DPPs) */}
            <div
              role="tablist"
              aria-label="Chapter resource categories"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              {CHAPTER_RESOURCE_TABS.map((tab) => {
                const Icon = TAB_ICONS[tab.id];
                const count = groupedChapterMaterials[tab.id]?.length ?? 0;
                const active = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      playClick();
                      setActiveSubTab(tab.id);
                    }}
                    className={`text-left p-4 rounded-2xl border transition-all duration-150 ${
                      active
                        ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB] shadow-sm'
                        : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-[#2563EB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Icon
                        className={`w-5 h-5 ${
                          active ? 'text-white' : 'text-[#2563EB] dark:text-sky-400'
                        }`}
                      />
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${
                          active ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    <p className="mt-2.5 font-display text-sm sm:text-base font-bold leading-snug">
                      {tab.label}
                    </p>
                    <p
                      className={`mt-1 text-xs line-clamp-1 ${
                        active ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tab.description}
                    </p>
                  </button>
                );
              })}

              {/* 5th Tab: Inline Chapter DPPs */}
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'chapter-dpps'}
                onClick={() => {
                  playClick();
                  setActiveSubTab('chapter-dpps');
                }}
                className={`text-left p-4 rounded-2xl border transition-all duration-150 ${
                  activeSubTab === 'chapter-dpps'
                    ? 'bg-[#F97316] text-white border-[#F97316] shadow-sm'
                    : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-[#F97316]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <ClipboardList
                    className={`w-5 h-5 ${
                      activeSubTab === 'chapter-dpps' ? 'text-white' : 'text-[#F97316]'
                    }`}
                  />
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      activeSubTab === 'chapter-dpps'
                        ? 'text-white/90'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {activeChapterDpps.items.length}
                  </span>
                </div>
                <p className="mt-2.5 font-display text-sm sm:text-base font-bold leading-snug">
                  Chapter DPPs
                </p>
                <p
                  className={`mt-1 text-xs line-clamp-1 ${
                    activeSubTab === 'chapter-dpps'
                      ? 'text-orange-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Timed inline practice exams
                </p>
              </button>
            </div>

            {/* Resource Cards OR Inline Chapter DPPs Inside Selected Sub-Tab */}
            {activeSubTab === 'chapter-dpps' ? (
              activeChapterDpps.items.length === 0 ? (
                <ReusableCard className="py-12 text-center space-y-3">
                  <ClipboardList className="w-10 h-10 text-slate-400 mx-auto" />
                  <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                    No Inline DPPs Published for This Subject Yet
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Switch to the Inline Chapter DPPs tab on Study Materials or attempt a full NTA CBT Mock Test.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <ReusableButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSwitchMode('dpps')}
                    >
                      Browse All Inline DPPs
                    </ReusableButton>
                    <ReusableButton variant="primary" size="sm" to="/cbt-mocks">
                      Open CBT Mock Tests
                    </ReusableButton>
                  </div>
                </ReusableCard>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <p>
                      {activeChapterDpps.isExact
                        ? `Showing timed Chapter DPPs matched to ${cleanActiveChapterName}. Launch any set inline with +4/-1 scoring.`
                        : `Showing recommended ${activeSubjectName} DPPs to practice right after ${cleanActiveChapterName}.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('dpps')}
                      className="font-semibold text-[#2563EB] dark:text-sky-400 hover:underline whitespace-nowrap"
                    >
                      View all inline DPPs →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {activeChapterDpps.items.map((dpp) =>
                      renderDppCard(
                        dpp,
                        activeChapterDpps.isExact ? 'Chapter DPP' : 'Recommended DPP'
                      )
                    )}
                  </div>
                </div>
              )
            ) : currentTabItems.length === 0 ? (
              <ReusableCard className="py-12 text-center space-y-3">
                <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  No {CHAPTER_RESOURCE_TABS.find((t) => t.id === activeSubTab)?.label} in this chapter yet
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {onlyBookmarked
                    ? 'Clear the Saved Only filter or switch tabs to browse other resources in this chapter.'
                    : 'Check the other resource tabs above, solve an inline Chapter DPP, or ask Preps AI for a quick chapter formula recap.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  {onlyBookmarked && (
                    <ReusableButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setOnlyBookmarked(false)}
                    >
                      Show All Resources
                    </ReusableButton>
                  )}
                  <ReusableButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveSubTab('chapter-dpps')}
                  >
                    Open Chapter DPPs
                  </ReusableButton>
                  <ReusableButton variant="primary" size="sm" to="/preps-ai">
                    Ask Preps AI About This Chapter
                  </ReusableButton>
                </div>
              </ReusableCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                {currentTabItems.map((mat) => {
                  const isVid = isVideoMaterial(mat);
                  const isBookmarked = bookmarkSet.has(mat.id);
                  const isImg = mat.mediaType === 'image' || mat.mimeType?.startsWith('image/');
                  const attachments = mat.attachments ?? [];

                  return (
                    <ReusableCard
                      key={mat.id}
                      interactive
                      padding="none"
                      className="flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        {isVid ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(mat)}
                            className="relative w-full aspect-video bg-slate-900 overflow-hidden group block"
                          >
                            {mat.thumbnailUrl ? (
                              <img
                                src={mat.thumbnailUrl}
                                alt={mat.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#0B1B3B] to-[#2563EB] flex items-center justify-center">
                                <Film className="w-9 h-9 text-white/80" />
                              </div>
                            )}
                            <span className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/15 transition-colors flex items-center justify-center">
                              <span className="h-12 w-12 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-lg">
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </span>
                            </span>
                          </button>
                        ) : mat.thumbnailUrl ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(mat)}
                            className="w-full h-36 bg-slate-100 dark:bg-slate-900 overflow-hidden block"
                          >
                            <img
                              src={mat.thumbnailUrl}
                              alt={mat.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </button>
                        ) : null}

                        <div className="p-6 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-xs font-semibold text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
                              {isVid ? (
                                <Film className="w-4 h-4 text-[#F97316]" />
                              ) : isImg ? (
                                <ImageIcon className="w-4 h-4 text-[#10B981]" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              <span>
                                {CHAPTER_RESOURCE_TABS.find((t) => t.id === activeSubTab)?.shortLabel}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="font-mono uppercase text-slate-500 dark:text-slate-400">
                                {isVid ? 'Video' : formatBytes(mat.fileSizeBytes)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                playClick();
                                toggleMaterialBookmark(mat.id);
                              }}
                              aria-pressed={isBookmarked}
                              aria-label={`${isBookmarked ? 'Remove bookmark for' : 'Bookmark'} ${mat.title}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#F97316] hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                            >
                              {isBookmarked ? (
                                <BookmarkCheck className="w-4 h-4 text-[#F97316]" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white leading-snug">
                            <Link
                              to={getHierarchicalMaterialPath(mat, {
                                subjectName: subjectMap.get(mat.subjectId)?.name,
                                cohortId:
                                  selectedCohort !== 'all' ? selectedCohort : mat.cohorts[0],
                              })}
                              className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                            >
                              {mat.title}
                            </Link>
                          </h2>

                          {mat.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              {mat.description}
                            </p>
                          )}

                          {attachments.length > 0 && (
                            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-[#F97316]" />
                                Attached PDFs ({attachments.length})
                              </p>
                              <div className="space-y-1.5">
                                {attachments.map((att) => (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() =>
                                      void handleDownloadDocument(
                                        att.fileUrl,
                                        att.fileName || `${att.title}.pdf`,
                                        mat.id,
                                        att.title
                                      )
                                    }
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-[#0B1B3B] dark:text-slate-200 hover:border-[#2563EB] transition-colors text-left"
                                  >
                                    <span className="truncate">{att.title}</span>
                                    <span className="inline-flex items-center gap-1 text-[#2563EB] dark:text-sky-400 shrink-0">
                                      <Download className="w-3.5 h-3.5" />
                                      PDF
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                        <ReusableButton
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenPreview(mat)}
                        >
                          {isVid ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                          )}
                          {isVid ? 'Watch Video' : 'Open PDF Reader'}
                        </ReusableButton>

                        {!isVid && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleDownloadDocument(
                                mat.fileUrl,
                                mat.fileName || `${mat.title}.pdf`,
                                mat.id,
                                mat.title
                              )
                            }
                            aria-label={`Download PDF ${mat.title}`}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-[#2563EB]/30 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] dark:text-sky-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        )}
                      </div>
                    </ReusableCard>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ================================================================
             MAIN VIEW — Unified Study Materials + Inline Chapter DPPs
             ================================================================ */
          <>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  Chapter Library &amp; Inline DPPs · {selectedCohortLabel}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
                  Study Materials
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl">
                  Revise chapter-wise Short Notes, Formula Sheets, Mind Maps, and PYQs — or switch to Inline Chapter DPPs for timed practice right here.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div
                  role="tablist"
                  aria-label="Study materials workspace mode"
                  className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={libraryMode === 'chapters'}
                    onClick={() => handleSwitchMode('chapters')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                      libraryMode === 'chapters'
                        ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB] shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1B3B] dark:hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Chapter Library
                    <span className="font-mono text-xs opacity-80 tabular-nums">
                      ({filteredChapters.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={libraryMode === 'dpps'}
                    onClick={() => handleSwitchMode('dpps')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                      libraryMode === 'dpps'
                        ? 'bg-[#F97316] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1B3B] dark:hover:text-white'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Chapter DPPs
                    <span className="font-mono text-xs opacity-85 tabular-nums">
                      ({cohortDpps.length})
                    </span>
                  </button>
                </div>
                <GuestDownloadBadge />
              </div>
            </div>

            {/* Subject Tabs + Clean Search & Track Bar */}
            <ReusableCard className="space-y-5">
              {/* Primary Subject Tabs */}
              <div
                role="tablist"
                aria-label="Study material subjects"
                className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4"
              >
                {libraryMode === 'dpps' && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedSubjectId === 'all' || !selectedSubjectId}
                    onClick={() => {
                      playClick();
                      setSelectedSubjectId('all');
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                      selectedSubjectId === 'all' || !selectedSubjectId
                        ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB] shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>All Subjects</span>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        selectedSubjectId === 'all' || !selectedSubjectId
                          ? 'text-white/80'
                          : 'text-slate-400'
                      }`}
                    >
                      {cohortDpps.length}
                    </span>
                  </button>
                )}

                {visibleSubjects.map((sub) => {
                  const active = selectedSubjectId === sub.id;
                  const subCount =
                    libraryMode === 'dpps'
                      ? cohortDpps.filter((d) => d.subjectId === sub.id).length
                      : cohortChapters.filter((c) => c.subjectId === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        playClick();
                        setSelectedSubjectId(sub.id);
                      }}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                        active
                          ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB] shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{sub.name}</span>
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          active ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        {subCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Class Track Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="relative md:col-span-6">
                  <label htmlFor="chapter-search" className="sr-only">
                    {libraryMode === 'dpps' ? 'Search Chapter DPPs' : 'Search chapters'}
                  </label>
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="chapter-search"
                    type="search"
                    placeholder={
                      libraryMode === 'dpps'
                        ? `Search ${activeSubjectName} DPPs by title or chapter...`
                        : `Search ${activeSubjectName} chapters (e.g. Electrostatics, Rotational Motion)...`
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div className={libraryMode === 'dpps' ? 'md:col-span-6' : 'md:col-span-4'}>
                  <label htmlFor="mat-cohort-filter" className="sr-only">
                    Filter by class or exam track
                  </label>
                  <select
                    id="mat-cohort-filter"
                    value={selectedCohort}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedCohort(next);
                      const nextParams = new URLSearchParams(searchParams);
                      if (next && next !== 'all') nextParams.set('track', next);
                      else nextParams.delete('track');
                      setSearchParams(nextParams, { replace: true });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                  >
                    <option value={cohortId}>My Active Track</option>
                    <option value="all">All Classes &amp; Exam Tracks</option>
                    {allCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {libraryMode === 'chapters' && (
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setOnlyBookmarked((b) => !b);
                      }}
                      aria-pressed={onlyBookmarked}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        onlyBookmarked
                          ? 'bg-[#F97316] text-white border-[#F97316]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#2563EB]'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                      Saved
                    </button>
                  </div>
                )}
              </div>
            </ReusableCard>

            {libraryMode === 'dpps' ? (
              /* ==============================================================
                 INLINE CHAPTER DPPs WORKSPACE (Merged directly into Materials)
                 ============================================================== */
              <div className="space-y-6">
                <DppGeneratorPanel
                  compact
                  cohortId={
                    selectedCohort === 'all' ? cohortId || 'class-12-jee' : selectedCohort
                  }
                  subjects={subjects}
                  chapters={chapters}
                  allQuestions={questions}
                  onLaunchDpp={(generatedTest, generatedQuestions) => {
                    setCustomDppQuestions(generatedQuestions);
                    setActiveDpp(generatedTest);
                  }}
                />

                {publishedDpps.length === 0 ? (
                  <ReusableCard className="py-14 text-center space-y-3">
                    <ClipboardList className="w-10 h-10 text-slate-400 mx-auto" />
                    <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                      No Chapter DPPs Match This Filter
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Switch to All Classes &amp; Exam Tracks or All Subjects to browse all available timed Chapter DPPs.
                    </p>
                    <ReusableButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedCohort('all');
                        setSelectedSubjectId('all');
                        setSearchQuery('');
                      }}
                    >
                      Show All Chapter DPPs
                    </ReusableButton>
                  </ReusableCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {publishedDpps.map((dpp) => renderDppCard(dpp))}
                  </div>
                )}

                {dppAttempts.length > 0 && (
                  <ReusableCard padding="sm" className="space-y-2.5">
                    <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                      Recent Inline DPP Attempts &amp; Solutions ({dppAttempts.length})
                    </h2>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[...dppAttempts].reverse().slice(0, 6).map((att) => (
                        <div
                          key={att.id}
                          className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                        >
                          <div>
                            <p className="font-semibold text-[#0B1B3B] dark:text-white">
                              {att.testTitle}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              Score: {att.score}/{att.maxScore} · Accuracy: {att.accuracyPercent}% ·{' '}
                              {new Date(att.submittedAtIso).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setReviewAttempt(att);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Analysis &amp; Solutions
                          </button>
                        </div>
                      ))}
                    </div>
                  </ReusableCard>
                )}
              </div>
            ) : filteredChapters.length === 0 ? (
              <ReusableCard className="py-14 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  No Chapters Found
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Try clearing your search query or switching to All Classes &amp; Exam Tracks.
                </p>
                <ReusableButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setOnlyBookmarked(false);
                  }}
                >
                  Reset Filters
                </ReusableButton>
              </ReusableCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredChapters.map((ch, idx) => {
                  const counts = chapterCountsMap.get(ch.id);
                  const totalCount = counts?.total ?? 0;
                  const exactDpps = chapterDppsMap.get(ch.id) ?? [];
                  const cleanTitle = stripChapterNumberPrefix(ch.name);
                  const summaryParts: string[] = [];
                  if (counts?.byTab['short-notes']) {
                    summaryParts.push(`${counts.byTab['short-notes']} Notes`);
                  }
                  if (counts?.byTab['formula-sheets']) {
                    summaryParts.push(`${counts.byTab['formula-sheets']} Formulas`);
                  }
                  if (counts?.byTab['mind-maps']) {
                    summaryParts.push(`${counts.byTab['mind-maps']} Mind Maps`);
                  }
                  if (counts?.byTab['chapter-pyqs']) {
                    summaryParts.push(`${counts.byTab['chapter-pyqs']} PYQs`);
                  }
                  if (exactDpps.length > 0) {
                    summaryParts.push(`${exactDpps.length} ${exactDpps.length === 1 ? 'DPP' : 'DPPs'}`);
                  }

                  const chapterMaterials = cohortMaterials.filter((m) => m.chapterId === ch.id);
                  const primaryMat = chapterMaterials[0];
                  const resolvedCohortSlug =
                    selectedCohort !== 'all' ? selectedCohort : ch.cohorts[0] || 'class-12-jee';
                  const resolvedSubSlug = resolveSubjectSlug(
                    ch.subjectId,
                    subjectMap.get(ch.subjectId)?.name
                  );
                  const chapterHref = primaryMat
                    ? getHierarchicalMaterialPath(primaryMat, {
                        subjectName: subjectMap.get(ch.subjectId)?.name,
                        cohortId: resolvedCohortSlug,
                      })
                    : `/materials/${generateCleanSlug(resolvedCohortSlug)}/${resolvedSubSlug}/${generateCleanSlug(cleanTitle)}`;

                  return (
                    <article
                      key={ch.id}
                      className="group text-left bg-white dark:bg-[#111A2E] border border-slate-200/90 dark:border-slate-800 hover:border-[#2563EB] dark:hover:border-sky-400 rounded-2xl p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-xs font-bold text-[#2563EB] dark:text-sky-400 tabular-nums">
                            CH {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                            {ch.weightageMarks} Marks · {ch.difficulty}
                          </span>
                        </div>

                        <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-sky-400 transition-colors leading-snug">
                          <Link
                            to={chapterHref}
                            onClick={(e) => {
                              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                                e.preventDefault();
                                handleSelectChapter(ch.id);
                              }
                            }}
                            className="hover:underline"
                          >
                            {cleanTitle}
                          </Link>
                        </h2>

                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {summaryParts.length > 0
                            ? summaryParts.join(' · ')
                            : 'Open chapter workspace'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSelectChapter(ch.id)}
                          className="text-slate-600 dark:text-slate-300 hover:text-[#2563EB] tabular-nums"
                        >
                          {totalCount} {totalCount === 1 ? 'Resource' : 'Resources'} inside
                        </button>
                        <Link
                          to={chapterHref}
                          className="inline-flex items-center gap-1 text-[#2563EB] dark:text-sky-400 group-hover:translate-x-0.5 transition-transform"
                        >
                          Open Chapter
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <NativeBannerAd />
          </>
        )}
      </ResponsiveContainer>

      {previewMaterial && (
        <FullPageMediaReader
          item={{
            id: previewMaterial.id,
            title: previewMaterial.title,
            sectionName: previewMaterial.sectionName,
            description: previewMaterial.description,
            url: resolvedPreviewUrl || previewMaterial.fileUrl,
            fileName: previewMaterial.fileName || `${previewMaterial.title}.pdf`,
            thumbnailUrl: previewMaterial.thumbnailUrl,
            mediaKind: isVideoMaterial(previewMaterial)
              ? 'video'
              : previewMaterial.mediaType === 'image' ||
                  previewMaterial.mimeType?.startsWith('image/')
                ? 'image'
                : 'pdf',
            youtubeId: activeYoutubeId,
            attachments: previewMaterial.attachments,
          }}
          isBookmarked={bookmarkSet.has(previewMaterial.id)}
          onToggleBookmark={() => toggleMaterialBookmark(previewMaterial.id)}
          onDownloadApproved={() => recordMaterialView(previewMaterial.id)}
          onClose={() => setPreviewMaterial(null)}
        />
      )}

      {reviewAttempt && (
        <AttemptReviewModal
          attempt={reviewAttempt}
          questions={questions}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </PageLayout>
  );
}
