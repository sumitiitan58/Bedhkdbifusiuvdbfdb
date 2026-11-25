import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Paperclip,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { FullPageMediaReader } from '../components/materials/FullPageMediaReader';
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
} from '../utils/catalogMerge';
import {
  CHAPTER_RESOURCE_TABS,
  computeChapterBucketCounts,
  groupChapterMaterialsByTab,
  type ChapterResourceTabId,
} from '../utils/studyHierarchy';
import {
  CANONICAL_ORIGIN,
  getHierarchicalMaterialPath,
  stripChapterNumberPrefix,
} from '../utils/seoHelpers';
import { playClick } from '../utils/soundEffects';
import type { StudentCohortId, StudyMaterialRecord } from '../types';

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

export default function MaterialsPage() {
  const { cohortId } = useAuth();
  const { requestPdfDownload } = useDownloadGate();
  const {
    allCohorts,
    subjects,
    chapters,
    materials,
    progress,
    toggleMaterialBookmark,
    recordMaterialView,
  } = usePlatformData();

  const [searchParams, setSearchParams] = useSearchParams();
  const trackParam = searchParams.get('track');
  const queryParam = searchParams.get('q');

  const [selectedCohort, setSelectedCohort] = useState<StudentCohortId | 'all'>(
    trackParam || cohortId || 'class-12-jee'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ChapterResourceTabId>('short-notes');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterialRecord | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');

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

  // Default to the first Subject Tab (Physics / Chemistry / Mathematics / Biology) so main view is strictly Subject Tabs -> Chapter Cards
  useEffect(() => {
    if (visibleSubjects.length === 0) return;
    if (!selectedSubjectId || !visibleSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(visibleSubjects[0].id);
    }
  }, [selectedSubjectId, visibleSubjects]);

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

  const activeSubjectName = activeChapter
    ? subjectMap.get(activeChapter.subjectId)?.name ?? 'Subject'
    : subjectMap.get(selectedSubjectId)?.name ?? 'All Subjects';

  const selectedCohortLabel =
    selectedCohort === 'all'
      ? 'JEE & NEET'
      : allCohorts.find((c) => c.id === selectedCohort)?.label ?? selectedCohort;

  const cleanActiveChapterName = activeChapter
    ? stripChapterNumberPrefix(activeChapter.name)
    : '';

  const seoTitle = activeChapter
    ? `${cleanActiveChapterName} Notes, Formula Sheet & PYQs – ${activeSubjectName} | Prepskm`
    : `${selectedCohortLabel} Chapter-Wise Study Materials | Prepskm`;

  const seoDescription = activeChapter
    ? `Explore ${cleanActiveChapterName} (${activeSubjectName}) Short Notes, Formula Sheets, Mind Maps, and Chapter PYQs for ${selectedCohortLabel} on Prepskm.`
    : `Structured chapter-first ${selectedCohortLabel} study library organized by Physics, Chemistry, Mathematics & Biology chapters on Prepskm.`;

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

  const currentTabItems = groupedChapterMaterials[activeSubTab] ?? [];

  return (
    <PageLayout>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        canonicalPath="/materials"
        keywords={
          activeChapter
            ? `${cleanActiveChapterName} short notes, ${cleanActiveChapterName} formula sheet, ${activeSubjectName} PYQs, ${selectedCohortLabel}`
            : `chapter wise notes, ${selectedCohortLabel} study materials, JEE notes, NEET notes, formula sheets, mind maps, prepskm`
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

            {/* 4 Hierarchical Chapter Resource Sub-Tabs */}
            <div
              role="tablist"
              aria-label="Chapter resource categories"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
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
            </div>

            {/* Resource Cards Inside Selected Sub-Tab */}
            {currentTabItems.length === 0 ? (
              <ReusableCard className="py-12 text-center space-y-3">
                <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  No {CHAPTER_RESOURCE_TABS.find((t) => t.id === activeSubTab)?.label} in this chapter yet
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {onlyBookmarked
                    ? 'Clear the Saved Only filter or switch tabs to browse other resources in this chapter.'
                    : 'Check the other resource tabs above or ask Preps AI for a quick chapter formula recap.'}
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
             MAIN VIEW — Strictly Subject Tabs + Clean Chapter Cards
             ================================================================ */
          <>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  Chapter-First Study Library · {selectedCohortLabel}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
                  Study Materials
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl">
                  Select a subject tab and open any chapter to access its Short Notes, Formula Sheets, Mind Maps, and Chapter PYQs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
                <GuestDownloadBadge />
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span>{filteredChapters.length} Chapters</span>
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
                {visibleSubjects.map((sub) => {
                  const active = selectedSubjectId === sub.id;
                  const subChapterCount = cohortChapters.filter(
                    (c) => c.subjectId === sub.id
                  ).length;
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
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
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
                        {subChapterCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Class Track Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="relative md:col-span-6">
                  <label htmlFor="chapter-search" className="sr-only">
                    Search chapters
                  </label>
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="chapter-search"
                    type="search"
                    placeholder={`Search ${activeSubjectName} chapters (e.g. Electrostatics, Rotational Motion)...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="md:col-span-4">
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
              </div>
            </ReusableCard>

            {/* Clean Chapter Cards Grid (ONLY Chapters — zero flat PDF dumps) */}
            {filteredChapters.length === 0 ? (
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

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleSelectChapter(ch.id)}
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
                          {cleanTitle}
                        </h2>

                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {summaryParts.length > 0
                            ? summaryParts.join(' · ')
                            : 'Open chapter workspace'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                          {totalCount} {totalCount === 1 ? 'Resource' : 'Resources'} inside
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#2563EB] dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                          Open Chapter
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </button>
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
    </PageLayout>
  );
}
