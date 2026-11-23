import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronRight,
  Download,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Maximize2,
  Paperclip,
  Play,
  Search,
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

function isFormulaSheet(mat: StudyMaterialRecord): boolean {
  const s = `${mat.sectionName ?? ''} ${mat.resourceType ?? ''} ${mat.title}`.toLowerCase();
  return s.includes('formula');
}

function getFriendlyResourceLabel(mat: StudyMaterialRecord): string {
  if (isVideoMaterial(mat)) return 'Video Lecture';
  if (mat.id.includes('-master')) return 'Master Formula Sheet';
  if (isFormulaSheet(mat)) return 'Formula Sheet';
  const raw = `${mat.sectionName ?? ''} ${mat.resourceType ?? ''}`.toLowerCase();
  if (raw.includes('pyq') || raw.includes('previous year')) return 'PYQ Archive';
  return 'Chapter Notes';
}

function sortChapterResources(items: StudyMaterialRecord[]): StudyMaterialRecord[] {
  const rank = (m: StudyMaterialRecord) => {
    if (isVideoMaterial(m)) return 3;
    if (isFormulaSheet(m)) return 2;
    return 1; // Chapter Notes always shown first
  };
  return [...items].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });
}

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
  const viewParam = searchParams.get('view') || searchParams.get('section');

  const [selectedCohort, setSelectedCohort] = useState<StudentCohortId | 'all'>(
    trackParam || cohortId || 'class-12-jee'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [browseMode, setBrowseMode] = useState<'chapters' | 'formula-sheets'>(() =>
    viewParam && viewParam.toLowerCase().includes('formula') ? 'formula-sheets' : 'chapters'
  );
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterialRecord | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');

  // Sync URL ?track= / ?q= / ?view= when arriving from Footer internal SEO links or SearchAction
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
    if (viewParam && viewParam.toLowerCase().includes('formula')) {
      setBrowseMode('formula-sheets');
    } else if (viewParam === 'chapters') {
      setBrowseMode('chapters');
    }
  }, [viewParam]);

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

  // Reset subject filter if the selected subject isn't part of the current Class/Sub-Class
  useEffect(() => {
    if (
      selectedSubjectId !== 'all' &&
      !visibleSubjects.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId('all');
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
  const chapterMap = useMemo(
    () => new Map(chapters.map((c) => [c.id, c])),
    [chapters]
  );

  const formulaSheetMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visibleSubjectIds = new Set(visibleSubjects.map((s) => s.id));
    return cohortMaterials
      .filter((m) => {
        if (!isFormulaSheet(m)) return false;
        if (selectedCohort !== 'all' && !visibleSubjectIds.has(m.subjectId)) return false;
        if (selectedSubjectId !== 'all' && m.subjectId !== selectedSubjectId) return false;
        if (onlyBookmarked && !bookmarkSet.has(m.id)) return false;
        if (q) {
          const subName = (subjectMap.get(m.subjectId)?.name ?? '').toLowerCase();
          const chName = (chapterMap.get(m.chapterId)?.name ?? '').toLowerCase();
          return (
            m.title.toLowerCase().includes(q) ||
            (m.description ?? '').toLowerCase().includes(q) ||
            (m.seoKeywords ?? '').toLowerCase().includes(q) ||
            subName.includes(q) ||
            chName.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const subA = subjectMap.get(a.subjectId)?.order ?? 99;
        const subB = subjectMap.get(b.subjectId)?.order ?? 99;
        if (subA !== subB) return subA - subB;
        const aMaster = a.id.includes('-master') ? 0 : 1;
        const bMaster = b.id.includes('-master') ? 0 : 1;
        if (aMaster !== bMaster) return aMaster - bMaster;
        const chA = chapterMap.get(a.chapterId)?.order ?? 999;
        const chB = chapterMap.get(b.chapterId)?.order ?? 999;
        if (chA !== chB) return chA - chB;
        return a.title.localeCompare(b.title);
      });
  }, [
    bookmarkSet,
    chapterMap,
    cohortMaterials,
    onlyBookmarked,
    searchQuery,
    selectedCohort,
    selectedSubjectId,
    subjectMap,
    visibleSubjects,
  ]);

  const totalFormulaSheetsInScope = useMemo(() => {
    const visibleSubjectIds = new Set(visibleSubjects.map((s) => s.id));
    return cohortMaterials.filter(
      (m) =>
        isFormulaSheet(m) &&
        (selectedCohort === 'all' || visibleSubjectIds.has(m.subjectId)) &&
        (selectedSubjectId === 'all' || m.subjectId === selectedSubjectId)
    ).length;
  }, [cohortMaterials, selectedCohort, selectedSubjectId, visibleSubjects]);

  // Strictly isolated Chapters filtered by Class/Sub-Class, Subject, and Search
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visibleSubjectIds = new Set(visibleSubjects.map((s) => s.id));
    const cohortChaps = filterChaptersByCohort(chapters, selectedCohort);
    return cohortChaps
      .filter((ch) => {
        if (selectedCohort !== 'all' && !visibleSubjectIds.has(ch.subjectId)) return false;
        if (selectedSubjectId !== 'all' && ch.subjectId !== selectedSubjectId) return false;
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
      .sort((a, b) => {
        const subA = subjectMap.get(a.subjectId)?.order ?? 99;
        const subB = subjectMap.get(b.subjectId)?.order ?? 99;
        if (subA !== subB) return subA - subB;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [
    bookmarkSet,
    chapters,
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

  // All notes & PDFs directly inside the clicked Chapter (NO section tabs or empty placeholders)
  const chapterMaterials = useMemo(() => {
    if (!activeChapter) return [];
    const scoped = cohortMaterials.filter((m) => {
      if (m.chapterId !== activeChapter.id) return false;
      if (onlyBookmarked && !bookmarkSet.has(m.id)) return false;
      return true;
    });
    return sortChapterResources(scoped);
  }, [activeChapter, bookmarkSet, cohortMaterials, onlyBookmarked]);

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
    : '';
  const selectedCohortLabel =
    selectedCohort === 'all'
      ? 'JEE & NEET'
      : allCohorts.find((c) => c.id === selectedCohort)?.label ?? selectedCohort;

  const cleanActiveChapterName = activeChapter
    ? stripChapterNumberPrefix(activeChapter.name)
    : '';

  const seoTitle = activeChapter
    ? `${cleanActiveChapterName} Notes & Formula Sheet PDF – ${activeSubjectName} | Prepskm`
    : browseMode === 'formula-sheets'
      ? `${selectedCohortLabel} Formula Sheets PDF – Physics, Chemistry, Maths & Biology | Prepskm`
      : `${selectedCohortLabel} Chapter-Wise Notes & Study Materials PDF | Prepskm`;

  const seoDescription = activeChapter
    ? `Read full-screen ${cleanActiveChapterName} (${activeSubjectName}) chapter notes and formula sheet PDFs free for ${selectedCohortLabel} on Prepskm.`
    : `Browse free chapter-wise ${selectedCohortLabel} notes, revision PDFs, and PCMB formula sheets for JEE Main, JEE Advanced & NEET UG on Prepskm.`;

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
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${CANONICAL_ORIGIN}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Chapter Notes & Study Materials',
              item: `${CANONICAL_ORIGIN}/materials`,
            },
            ...(activeChapter
              ? [
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: `${cleanActiveChapterName} (${activeSubjectName})`,
                    item: `${CANONICAL_ORIGIN}/materials`,
                  },
                ]
              : []),
          ],
        },
      ],
    }),
    [activeChapter, activeSubjectName, cleanActiveChapterName, seoDescription, seoTitle]
  );

  const activeYoutubeId =
    previewMaterial && isVideoMaterial(previewMaterial)
      ? extractYouTubeId(previewMaterial.fileUrl)
      : null;

  return (
    <PageLayout>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        canonicalPath="/materials"
        keywords={
          activeChapter
            ? `${cleanActiveChapterName} notes pdf, ${activeSubjectName} chapter notes, ${selectedCohortLabel}, formula sheet, prepskm`
            : `chapter wise notes pdf, ${selectedCohortLabel} notes, JEE notes, NEET notes, PCMB formula sheets, prepskm`
        }
        jsonLd={materialsJsonLd}
      />

      <ResponsiveContainer className="py-5 sm:py-8 space-y-5 sm:space-y-6">
        {/* VIEW A: CLEAN CHAPTER NOTES VIEW (Direct Notes & Formula Sheets — Zero Section Clutter) */}
        {activeChapter ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setActiveChapterId(null);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#0B1B3B] dark:text-white bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 hover:border-[#2563EB] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to All Chapters
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <GuestDownloadBadge />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {activeSubjectName} · Weightage: {activeChapter.weightageMarks} Marks ·{' '}
                  {activeChapter.difficulty}
                </span>
              </div>
            </div>

            <ReusableCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  {activeSubjectName} · {selectedCohortLabel}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
                  {activeChapter.name}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Open any chapter note or formula sheet directly in full-screen PDF reader or download for offline revision.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  setOnlyBookmarked((b) => !b);
                }}
                aria-pressed={onlyBookmarked}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors self-start sm:self-center shrink-0 ${
                  onlyBookmarked
                    ? 'bg-[#F97316] text-white border-[#F97316]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#2563EB]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Bookmarked Only
              </button>
            </ReusableCard>

            {chapterMaterials.length === 0 ? (
              <ReusableCard className="py-12 text-center space-y-3">
                <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  {onlyBookmarked ? 'No Bookmarked Notes in This Chapter' : 'No Notes Uploaded Yet'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {onlyBookmarked
                    ? 'Clear the Bookmarked filter to view all available PDFs in this chapter.'
                    : 'Chapter notes and formula sheets for this chapter will appear here as soon as they are published.'}
                </p>
                {onlyBookmarked && (
                  <ReusableButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setOnlyBookmarked(false)}
                  >
                    Show All Chapter PDFs
                  </ReusableButton>
                )}
              </ReusableCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
                {chapterMaterials.map((mat) => {
                  const isVid = isVideoMaterial(mat);
                  const isBookmarked = bookmarkSet.has(mat.id);
                  const isImg = mat.mediaType === 'image' || mat.mimeType?.startsWith('image/');
                  const attachments = mat.attachments ?? [];
                  const friendlyLabel = getFriendlyResourceLabel(mat);

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
                              <span className="h-11 w-11 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-lg">
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </span>
                            </span>
                            {mat.durationMinutes && (
                              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-white font-mono text-[11px] font-semibold">
                                {mat.durationMinutes} min
                              </span>
                            )}
                          </button>
                        ) : mat.thumbnailUrl ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(mat)}
                            className="w-full h-32 bg-slate-100 dark:bg-slate-900 overflow-hidden block"
                          >
                            <img
                              src={mat.thumbnailUrl}
                              alt={mat.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </button>
                        ) : null}

                        <div className="p-3.5 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[11px] font-semibold text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
                              {isVid ? (
                                <Film className="w-3.5 h-3.5 text-[#F97316]" />
                              ) : isImg ? (
                                <ImageIcon className="w-3.5 h-3.5 text-[#10B981]" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                              <span>{friendlyLabel}</span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="uppercase">
                                {isVid ? 'Video' : mat.mediaType ?? 'PDF'}
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
                              className="p-1 rounded-lg text-slate-500 hover:text-[#F97316] hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                            >
                              {isBookmarked ? (
                                <BookmarkCheck className="w-4 h-4 text-[#F97316]" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <h2 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white leading-snug">
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
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                              {mat.description}
                            </p>
                          )}

                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {isVid
                              ? `${mat.durationMinutes ?? 30} min · Stream Only`
                              : formatBytes(mat.fileSizeBytes)}
                          </p>

                          {attachments.length > 0 && (
                            <div className="pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Paperclip className="w-3 h-3 text-[#F97316]" />
                                Attached PDFs ({attachments.length})
                              </p>
                              <div className="space-y-1">
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
                                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-[#0B1B3B] dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors text-left"
                                  >
                                    <span className="truncate">{att.title}</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] dark:text-sky-400 shrink-0">
                                      <Download className="w-3 h-3" />
                                      PDF
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
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
                          {isVid ? 'Watch Full Screen' : 'Full-Screen PDF'}
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
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#2563EB]/30 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] dark:text-sky-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0"
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
          /* VIEW B: CHAPTER DIRECTORY & FORMULA SHEETS (Zero "Section" Clutter) */
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  Full-Screen Chapter Notes &amp; Formula Sheets
                </p>
                <h1 className="font-display text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
                  Chapter-Wise Study Materials
                </h1>
                <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  Open any chapter to read concise notes and PCMB formula sheets in full-screen PDF mode or download for offline revision.
                </p>
              </div>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400 shrink-0 whitespace-nowrap">
                <GuestDownloadBadge />
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span>{filteredChapters.length} Chapters</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span>{cohortMaterials.length} PDFs</span>
              </div>
            </div>

            {/* Clean Filter Bar (No Section Jargon) */}
            <ReusableCard padding="sm" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative lg:col-span-2">
                  <label htmlFor="chapter-search" className="sr-only">
                    Search chapters or notes
                  </label>
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="chapter-search"
                    type="search"
                    placeholder="Search chapter name, subject, or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="all">All Classes &amp; Sub-Classes</option>
                    <option value={cohortId}>My Active Track</option>
                    {allCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="mat-subject-filter" className="sr-only">
                    Filter by subject
                  </label>
                  <select
                    id="mat-subject-filter"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="all">All Track Subjects ({visibleSubjects.length})</option>
                    {visibleSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Quick Tabs + Clean Library Switch */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setSelectedSubjectId('all');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedSubjectId === 'all'
                        ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    All Subjects
                  </button>
                  {visibleSubjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedSubjectId(s.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        selectedSubjectId === s.id
                          ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setBrowseMode('chapters');
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.delete('view');
                      nextParams.delete('section');
                      setSearchParams(nextParams, { replace: true });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      browseMode === 'chapters'
                        ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                    }`}
                  >
                    Chapter Notes ({filteredChapters.length})
                  </button>

                  {totalFormulaSheetsInScope > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setBrowseMode('formula-sheets');
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('view', 'formula-sheets');
                        nextParams.delete('section');
                        setSearchParams(nextParams, { replace: true });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        browseMode === 'formula-sheets'
                          ? 'bg-[#F97316] text-white border-[#F97316]'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#F97316]'
                      }`}
                    >
                      Formula Sheets ({totalFormulaSheetsInScope})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setOnlyBookmarked((b) => !b);
                    }}
                    aria-pressed={onlyBookmarked}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      onlyBookmarked
                        ? 'bg-[#F97316] text-white border-[#F97316]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Saved
                  </button>
                </div>
              </div>
            </ReusableCard>

            {/* Formula Sheets Grid OR Chapter Notes Directory */}
            {browseMode === 'formula-sheets' ? (
              formulaSheetMaterials.length === 0 ? (
                <ReusableCard className="py-12 text-center space-y-3">
                  <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
                  <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                    No Formula Sheets Match This Filter
                  </h2>
                  <ReusableButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSubjectId('all');
                      setOnlyBookmarked(false);
                    }}
                  >
                    Clear Filters
                  </ReusableButton>
                </ReusableCard>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
                  {formulaSheetMaterials.map((mat) => {
                    const subj = subjectMap.get(mat.subjectId);
                    const isBookmarked = bookmarkSet.has(mat.id);
                    const isMasterSheet = mat.id.includes('-master');
                    return (
                      <ReusableCard
                        key={mat.id}
                        interactive
                        padding="none"
                        className="flex flex-col justify-between overflow-hidden"
                      >
                        <div className="p-3.5 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[11px] font-semibold flex flex-wrap items-center gap-1.5">
                              <span className="text-[#2563EB] dark:text-sky-400 inline-flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                {subj?.name ?? 'Subject'}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span
                                className={
                                  isMasterSheet
                                    ? 'text-[#F97316] font-bold'
                                    : 'text-slate-500 dark:text-slate-400'
                                }
                              >
                                {isMasterSheet ? 'Master Sheet' : 'Formula Sheet'}
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
                              className="p-1 rounded-lg text-slate-500 hover:text-[#F97316] hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                            >
                              {isBookmarked ? (
                                <BookmarkCheck className="w-4 h-4 text-[#F97316]" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <h2 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white leading-snug">
                            <Link
                              to={getHierarchicalMaterialPath(mat, {
                                subjectName: subj?.name,
                                cohortId:
                                  selectedCohort !== 'all' ? selectedCohort : mat.cohorts[0],
                              })}
                              className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                            >
                              {mat.title}
                            </Link>
                          </h2>

                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {formatBytes(mat.fileSizeBytes)} · PDF
                          </p>
                        </div>

                        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <ReusableButton
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleOpenPreview(mat)}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Full-Screen PDF
                          </ReusableButton>

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
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#2563EB]/30 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] dark:text-sky-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      </ReusableCard>
                    );
                  })}
                </div>
              )
            ) : filteredChapters.length === 0 ? (
              <ReusableCard className="py-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  No Matching Chapters Found
                </h2>
                <ReusableButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedCohort('all');
                    setSelectedSubjectId('all');
                    setSearchQuery('');
                    setOnlyBookmarked(false);
                  }}
                >
                  Reset Filters
                </ReusableButton>
              </ReusableCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredChapters.map((ch) => {
                  const subj = subjectMap.get(ch.subjectId);
                  const chItems = sortChapterResources(
                    cohortMaterials.filter((m) => m.chapterId === ch.id)
                  );
                  const primaryNote =
                    chItems.find((m) => !isVideoMaterial(m) && !isFormulaSheet(m)) ??
                    chItems.find((m) => !isVideoMaterial(m)) ??
                    null;
                  const noteCount = chItems.filter(
                    (m) => !isVideoMaterial(m) && !isFormulaSheet(m)
                  ).length;
                  const formulaCount = chItems.filter((m) => isFormulaSheet(m)).length;
                  const pdfCount = chItems.filter((m) => !isVideoMaterial(m)).length;
                  const summaryParts: string[] = [];
                  if (noteCount > 0) summaryParts.push(`${noteCount} Notes PDF`);
                  if (formulaCount > 0)
                    summaryParts.push(
                      formulaCount === 1 ? 'Formula Sheet' : `${formulaCount} Formula Sheets`
                    );
                  if (summaryParts.length === 0 && chItems.length > 0) {
                    summaryParts.push(`${chItems.length} Resource${chItems.length > 1 ? 's' : ''}`);
                  }

                  return (
                    <div
                      key={ch.id}
                      className="group rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-3.5 sm:p-4 hover:border-[#2563EB] dark:hover:border-sky-400 hover:shadow-md transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold">
                          <span className="text-[#2563EB] dark:text-sky-400 truncate">
                            {subj?.name ?? 'Subject'}
                          </span>
                          <span className="font-mono text-[#F97316] tabular-nums">
                            {ch.weightageMarks}M · {ch.difficulty}
                          </span>
                        </div>

                        <h2 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white leading-snug">
                          {primaryNote ? (
                            <Link
                              to={getHierarchicalMaterialPath(primaryNote, {
                                subjectName: subj?.name,
                                cohortId:
                                  selectedCohort !== 'all'
                                    ? selectedCohort
                                    : primaryNote.cohorts[0],
                              })}
                              className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                            >
                              {ch.name}
                            </Link>
                          ) : (
                            ch.name
                          )}
                        </h2>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {summaryParts.length > 0
                            ? summaryParts.join(' · ')
                            : 'Notes coming soon'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        {primaryNote ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(primaryNote)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1B3B] hover:bg-[#162C5B] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors flex-1"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Read Full Screen</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No PDF yet</span>
                        )}

                        {pdfCount > 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setActiveChapterId(ch.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors shrink-0"
                          >
                            <span>All ({chItems.length})</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : primaryNote ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleDownloadDocument(
                                primaryNote.fileUrl,
                                primaryNote.fileName || `${primaryNote.title}.pdf`,
                                primaryNote.id,
                                primaryNote.title
                              )
                            }
                            aria-label={`Download PDF for ${ch.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#2563EB]/30 bg-blue-50/70 dark:bg-blue-950/40 text-xs font-semibold text-[#2563EB] dark:text-sky-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Direct Crawlable Published Notes & Formula Sheets Index (SEO-only, visually hidden) */}
            {cohortMaterials.length > 0 && (
              <section aria-label="Published Notes and PDFs Index" className="sr-only">
                <h2>Published Chapter Notes &amp; Formula Sheets ({cohortMaterials.length})</h2>
                <ul>
                  {cohortMaterials.map((mat) => (
                    <li key={mat.id}>
                      <Link
                        to={getHierarchicalMaterialPath(mat, {
                          subjectName: subjectMap.get(mat.subjectId)?.name,
                          cohortId:
                            selectedCohort !== 'all' ? selectedCohort : mat.cohorts[0],
                        })}
                      >
                        {getFriendlyResourceLabel(mat)} ·{' '}
                        {subjectMap.get(mat.subjectId)?.name ?? 'Subject'} — {mat.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <NativeBannerAd />
      </ResponsiveContainer>

      {/* True Full-Screen PDF Reader / Video Theater (Portaled to document.body at z-[9999]) */}
      {previewMaterial && (
        <FullPageMediaReader
          item={{
            id: previewMaterial.id,
            title: previewMaterial.title,
            sectionName: getFriendlyResourceLabel(previewMaterial),
            description: previewMaterial.description,
            url: resolvedPreviewUrl || previewMaterial.fileUrl,
            fileName: previewMaterial.fileName,
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
          onClose={() => setPreviewMaterial(null)}
          onDownloadApproved={() => recordMaterialView(previewMaterial.id)}
        />
      )}
    </PageLayout>
  );
}
