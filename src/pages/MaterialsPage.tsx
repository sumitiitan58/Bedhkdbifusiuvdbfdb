import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
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
import { CANONICAL_ORIGIN, getHierarchicalMaterialPath } from '../utils/seoHelpers';
import { playClick } from '../utils/soundEffects';
import type {
  ChapterRecord,
  SectionRecord,
  StudentCohortId,
  StudyMaterialRecord,
} from '../types';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Resource';
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

function sectionAppliesToChapter(section: SectionRecord, chapter: ChapterRecord): boolean {
  const scope = section.scope ?? 'all';
  if (scope === 'all') return true;
  if (scope === 'subjects') {
    return (section.subjectIds ?? []).includes(chapter.subjectId);
  }
  if (scope === 'chapters') {
    return (section.chapterIds ?? []).includes(chapter.id);
  }
  return true;
}

function isVideoMaterial(mat: StudyMaterialRecord): boolean {
  if (mat.mediaType === 'video') return true;
  if (mat.mimeType?.startsWith('video/')) return true;
  if (extractYouTubeId(mat.fileUrl)) return true;
  return /\.(mp4|webm|mov)(\?|$)/i.test(mat.fileUrl);
}

export default function MaterialsPage() {
  const { cohortId } = useAuth();
  const { requestPdfDownload } = useDownloadGate();
  const {
    allCohorts,
    subjects,
    chapters,
    sections,
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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterialRecord | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');

  // Sync from URL ?track= / ?q= when arriving from Footer internal SEO links or SearchAction
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

  // Strictly isolated Chapters filtered by Class/Sub-Class, Subject, and Search
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visibleSubjectIds = new Set(visibleSubjects.map((s) => s.id));
    const cohortChaps = filterChaptersByCohort(chapters, selectedCohort);
    return cohortChaps
      .filter((ch) => {
        if (selectedCohort !== 'all' && !visibleSubjectIds.has(ch.subjectId)) return false;
        if (selectedSubjectId !== 'all' && ch.subjectId !== selectedSubjectId) return false;
        if (q) {
          const subName = (subjectMap.get(ch.subjectId)?.name ?? '').toLowerCase();
          const chMats = cohortMaterials.filter((m) => m.chapterId === ch.id);
          const matchesMaterial = chMats.some(
            (m) =>
              m.title.toLowerCase().includes(q) ||
              (m.description ?? '').toLowerCase().includes(q) ||
              m.sectionName.toLowerCase().includes(q)
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
  }, [chapters, cohortMaterials, searchQuery, selectedCohort, selectedSubjectId, subjectMap, visibleSubjects]);

  const activeChapter = useMemo(
    () => (activeChapterId ? chapters.find((c) => c.id === activeChapterId) ?? null : null),
    [activeChapterId, chapters]
  );

  // All materials in this chapter STRICTLY belonging to the active Class/Sub-Class
  const activeChapterAllCohortMaterials = useMemo(() => {
    if (!activeChapter) return [];
    return cohortMaterials.filter((m) => m.chapterId === activeChapter.id);
  }, [activeChapter, cohortMaterials]);

  // Sections applicable to the clicked chapter (only showing Concise Notes / scoped sections properly)
  const chapterSections = useMemo(() => {
    if (!activeChapter) return [];
    const applicable = sections.filter((sec) => {
      if (!sectionAppliesToChapter(sec, activeChapter)) return false;
      // Keep Concise Notes scoped to JEE tracks (or whenever items exist in it for this track)
      if (
        sec.slug === 'concise-notes' &&
        selectedCohort !== 'all' &&
        !selectedCohort.includes('jee') &&
        !activeChapterAllCohortMaterials.some((m) => m.sectionName === sec.name)
      ) {
        return false;
      }
      return true;
    });
    const existingNames = new Set(applicable.map((s) => s.name));
    const extraNames = Array.from(
      new Set(
        activeChapterAllCohortMaterials
          .filter((m) => !existingNames.has(m.sectionName))
          .map((m) => m.sectionName)
      )
    );
    const extras: SectionRecord[] = extraNames.map((name, idx) => ({
      id: `extra-${idx}-${name}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: 100 + idx,
      scope: 'chapters',
    }));
    return [...applicable, ...extras].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [activeChapter, activeChapterAllCohortMaterials, sections, selectedCohort]);

  // Strictly isolated Materials inside the opened Chapter
  const chapterMaterials = useMemo(() => {
    if (!activeChapter) return [];
    return activeChapterAllCohortMaterials.filter((m) => {
      if (activeSectionFilter !== 'all' && m.sectionName !== activeSectionFilter) return false;
      if (onlyBookmarked && !bookmarkSet.has(m.id)) return false;
      return true;
    });
  }, [activeChapter, activeChapterAllCohortMaterials, activeSectionFilter, bookmarkSet, onlyBookmarked]);

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
      fileName: suggestedName || 'PREPSKM-Study-Material.pdf',
      title: displayTitle || suggestedName || 'Study Material PDF',
      materialId,
      onApproved: () => {
        if (materialId) recordMaterialView(materialId);
      },
    });
  };

  const activeSubjectName = activeChapter
    ? subjectMap.get(activeChapter.subjectId)?.name ?? 'Subject'
    : '';

  const seoTitle = activeChapter
    ? `${activeChapter.name} (${activeSubjectName}) Concise Notes & PYQs - Prepskm`
    : 'JEE & NEET Chapter-Wise Study Materials & Notes - Prepskm';

  const seoDescription = activeChapter
    ? `Download free ${activeChapter.name} (${activeSubjectName}) Concise Notes, Short Notes, Formula Sheets, and PYQs on Prepskm.`
    : 'Browse free JEE Main, JEE Advanced, NEET UG & Board chapter-wise Concise Notes, Short Notes, Formula Sheets, and PYQ PDFs on Prepskm.';

  const materialsJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: activeChapter ? `${activeChapter.name} — ${activeSubjectName}` : 'Prepskm Chapter Study Materials & Concise Notes',
      description: seoDescription,
      provider: { '@type': 'EducationalOrganization', name: 'Prepskm', url: CANONICAL_ORIGIN },
    }),
    [activeChapter, activeSubjectName, seoDescription]
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
            ? `${activeChapter.name}, ${activeSubjectName}, JEE notes, NEET notes, PYQs, formula sheet`
            : 'chapter wise study materials, JEE short notes, NEET biology NCERT, concept videos, PYQ PDFs'
        }
        jsonLd={materialsJsonLd}
      />

      <ResponsiveContainer className="py-5 sm:py-8 space-y-5 sm:space-y-6">
        {/* VIEW A: CHAPTER DETAIL WORKSPACE (Shows Admin Sections -> PDFs & Videos with Thumbnails) */}
        {activeChapter ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setActiveChapterId(null);
                  setActiveSectionFilter('all');
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

            <ReusableCard className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  {activeSubjectName} Chapter Workspace
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
                  {activeChapter.name}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Browse every faculty-curated section inside this chapter — open PDFs, inspect
                  formula sheets, or watch concept videos right here.
                </p>
              </div>

              {/* Section Tabs inside Chapter */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chapter sections">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSectionFilter === 'all'}
                    onClick={() => {
                      playClick();
                      setActiveSectionFilter('all');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      activeSectionFilter === 'all'
                        ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                    }`}
                  >
                    All Sections ({activeChapterAllCohortMaterials.length})
                  </button>

                  {chapterSections.map((sec) => {
                    const count = activeChapterAllCohortMaterials.filter(
                      (m) => m.sectionName === sec.name
                    ).length;
                    const active = activeSectionFilter === sec.name;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          playClick();
                          setActiveSectionFilter(sec.name);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                        }`}
                      >
                        {sec.name} ({count})
                      </button>
                    );
                  })}
                </div>

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
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Bookmarked
                </button>
              </div>
            </ReusableCard>

            {/* Grouped Sections View or Filtered Section Grid */}
            {chapterMaterials.length === 0 ? (
              <ReusableCard className="py-12 text-center space-y-3">
                <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  No Files Uploaded in This Section Yet
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Admins can upload PDFs, images, or video lessons with thumbnails to this section anytime from the Admin Console.
                </p>
                {activeSectionFilter !== 'all' && (
                  <ReusableButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveSectionFilter('all')}
                  >
                    Show All Sections in {activeChapter.name}
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

                  return (
                    <ReusableCard
                      key={mat.id}
                      interactive
                      padding="none"
                      className="flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        {/* Video Thumbnail / Visual Banner */}
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
                              <span>{mat.sectionName}</span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="uppercase">{isVid ? 'Video' : mat.mediaType ?? 'PDF'}</span>
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

                          <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white leading-snug">
                            <Link
                              to={getHierarchicalMaterialPath(mat, {
                                subjectName: subjectMap.get(mat.subjectId)?.name,
                                cohortId: selectedCohort !== 'all' ? selectedCohort : mat.cohorts[0],
                              })}
                              className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                            >
                              {mat.title}
                            </Link>
                          </h3>

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

                          {/* Tagged PDF / Document Attachments on Videos */}
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
                          {isVid ? <Play className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {isVid ? 'Watch Video' : 'Open Book Preview'}
                        </ReusableButton>

                        {/* Download button ONLY for PDFs/Documents/Images — NEVER for Videos */}
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
                            Download PDF
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
          /* VIEW B: CHAPTER DIRECTORY (Click any Chapter -> opens its Scoped Sections) */
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                  Click Any Chapter → Open Sections (PDFs &amp; Videos)
                </p>
                <h1 className="font-display text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
                  Chapter-Wise Study Materials
                </h1>
                <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  Select a chapter to explore admin-curated Short Notes, Concept Videos with thumbnails, Formula Sheets, and PYQs.
                </p>
              </div>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400 shrink-0 whitespace-nowrap">
                <GuestDownloadBadge />
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span>{filteredChapters.length} Chapters</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span>{cohortMaterials.length} Resources</span>
              </div>
            </div>

            {/* Filter Bar */}
            <ReusableCard padding="sm" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative lg:col-span-2">
                  <label htmlFor="chapter-search" className="sr-only">
                    Search chapters or materials
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
                    Filter by class or sub-class
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

              {/* Subject Quick Tabs */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
            </ReusableCard>

            {/* Chapters Card Grid */}
            {filteredChapters.length === 0 ? (
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
                  }}
                >
                  Reset Filters
                </ReusableButton>
              </ReusableCard>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {filteredChapters.map((ch) => {
                  const subj = subjectMap.get(ch.subjectId);
                  const chItems = cohortMaterials.filter((m) => m.chapterId === ch.id);
                  const applicableSecs = sections.filter((s) => sectionAppliesToChapter(s, ch));
                  const videoCount = chItems.filter((m) => isVideoMaterial(m)).length;
                  const pdfCount = chItems.length - videoCount;

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setActiveChapterId(ch.id);
                        setActiveSectionFilter('all');
                      }}
                      className="group text-left rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-3 sm:p-4 hover:border-[#2563EB] dark:hover:border-sky-400 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 sm:gap-3"
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

                        <h2 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-sky-400 transition-colors leading-snug">
                          {ch.name}
                        </h2>

                        <p className="hidden sm:block text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-1">
                          {applicableSecs.slice(0, 3).map((s) => s.name).join(' · ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
                        <span className="text-slate-600 dark:text-slate-300 tabular-nums inline-flex items-center gap-1.5">
                          <span>{pdfCount} PDF</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span>{videoCount} Vid</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[#2563EB] dark:text-sky-400">
                          <span className="hidden sm:inline">Open</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Direct Crawlable Published PDFs & Concise Notes Index (SEO-only, visually hidden) */}
            {cohortMaterials.length > 0 && (
              <section aria-label="Published Notes and PDFs Index" className="sr-only">
                <h2>Published Notes &amp; PDFs ({cohortMaterials.length})</h2>
                <ul>
                  {cohortMaterials.map((mat) => (
                    <li key={mat.id}>
                      <Link
                        to={getHierarchicalMaterialPath(mat, {
                          subjectName: subjectMap.get(mat.subjectId)?.name,
                          cohortId: selectedCohort !== 'all' ? selectedCohort : mat.cohorts[0],
                        })}
                      >
                        {mat.sectionName} · {subjectMap.get(mat.subjectId)?.name ?? 'Subject'} — {mat.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        {/* Non-intrusive Native Banner Ad below the Notes/Chapter list */}
        <NativeBannerAd />
      </ResponsiveContainer>

      {/* Full-Page Book PDF Reader / Full-Page Video Theater (No boxed popup modal) */}
      {previewMaterial && (
        <FullPageMediaReader
          item={{
            id: previewMaterial.id,
            title: previewMaterial.title,
            sectionName: previewMaterial.sectionName,
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
