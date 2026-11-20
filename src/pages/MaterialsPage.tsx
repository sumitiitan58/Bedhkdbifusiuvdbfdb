import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Paperclip,
  Play,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { resolveAssetUrl } from '../utils/instantUpload';
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

  const [selectedCohort, setSelectedCohort] = useState<StudentCohortId | 'all'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterialRecord | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');

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

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );
  const bookmarkSet = useMemo(
    () => new Set(progress.bookmarkedMaterials),
    [progress.bookmarkedMaterials]
  );

  // Chapters filtered by Class/Cohort, Subject, and Search
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return chapters.filter((ch) => {
      if (selectedCohort !== 'all' && !ch.cohorts.includes(selectedCohort)) return false;
      if (selectedSubjectId !== 'all' && ch.subjectId !== selectedSubjectId) return false;
      if (q) {
        const subName = (subjectMap.get(ch.subjectId)?.name ?? '').toLowerCase();
        const chMats = materials.filter((m) => m.chapterId === ch.id);
        const matchesMaterial = chMats.some(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            (m.description ?? '').toLowerCase().includes(q) ||
            m.sectionName.toLowerCase().includes(q)
        );
        return ch.name.toLowerCase().includes(q) || subName.includes(q) || matchesMaterial;
      }
      return true;
    });
  }, [chapters, materials, searchQuery, selectedCohort, selectedSubjectId, subjectMap]);

  const activeChapter = useMemo(
    () => (activeChapterId ? chapters.find((c) => c.id === activeChapterId) ?? null : null),
    [activeChapterId, chapters]
  );

  // Sections applicable to the clicked chapter (All Subjects + Multi-Subject + Specific Chapter)
  const chapterSections = useMemo(() => {
    if (!activeChapter) return [];
    const applicable = sections.filter((sec) => sectionAppliesToChapter(sec, activeChapter));
    // Also ensure any section name referenced by materials in this chapter appears
    const existingNames = new Set(applicable.map((s) => s.name));
    const extraNames = Array.from(
      new Set(
        materials
          .filter((m) => m.chapterId === activeChapter.id && !existingNames.has(m.sectionName))
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
    return [...applicable, ...extras];
  }, [activeChapter, materials, sections]);

  // Materials inside the opened Chapter
  const chapterMaterials = useMemo(() => {
    if (!activeChapter) return [];
    return materials.filter((m) => {
      if (m.chapterId !== activeChapter.id) return false;
      if (activeSectionFilter !== 'all' && m.sectionName !== activeSectionFilter) return false;
      if (onlyBookmarked && !bookmarkSet.has(m.id)) return false;
      return true;
    });
  }, [activeChapter, activeSectionFilter, bookmarkSet, materials, onlyBookmarked]);

  const handleOpenPreview = (mat: StudyMaterialRecord) => {
    playClick();
    recordMaterialView(mat.id);
    setPreviewMaterial(mat);
  };

  const handleDownloadDocument = async (
    rawUrl: string,
    suggestedName?: string,
    materialId?: string
  ) => {
    playClick();
    if (materialId) recordMaterialView(materialId);
    const resolved = (await resolveAssetUrl(rawUrl)) || rawUrl;
    if (!resolved) return;
    const link = document.createElement('a');
    link.href = resolved;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = suggestedName || 'PREPSKM-Study-Material.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeSubjectName = activeChapter
    ? subjectMap.get(activeChapter.subjectId)?.name ?? 'Subject'
    : '';

  const seoTitle = activeChapter
    ? `${activeChapter.name} (${activeSubjectName}) Notes, PYQs & Videos — PREPSKM.IN`
    : 'Chapter-Wise Study Materials, PDFs & Concept Videos — PREPSKM.IN';

  const seoDescription = activeChapter
    ? `Explore ${activeChapter.name} in ${activeSubjectName}: admin-curated Short Notes, Formula Sheets, PYQs, and Concept Videos with thumbnails for JEE, NEET & Boards on PREPSKM.IN.`
    : 'Click any chapter across Physics, Chemistry, Mathematics, and Biology to explore structured Short Notes, Formula Sheets, PYQs, and Concept Videos on PREPSKM.IN.';

  const materialsJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: activeChapter ? `${activeChapter.name} — ${activeSubjectName}` : 'PREPSKM.IN Chapter Study Materials',
      description: seoDescription,
      provider: { '@type': 'Organization', name: 'PREPSKM.IN', url: 'https://prepskm.in/' },
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

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {activeSubjectName} · Weightage: {activeChapter.weightageMarks} Marks ·{' '}
                {activeChapter.difficulty}
              </span>
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
                    All Sections ({materials.filter((m) => m.chapterId === activeChapter.id).length})
                  </button>

                  {chapterSections.map((sec) => {
                    const count = materials.filter(
                      (m) => m.chapterId === activeChapter.id && m.sectionName === sec.name
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
                            {mat.title}
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
                                        mat.id
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
                          {isVid ? 'Watch Video' : 'Open Preview'}
                        </ReusableButton>

                        {/* Download button ONLY for PDFs/Documents/Images — NEVER for Videos */}
                        {!isVid && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleDownloadDocument(
                                mat.fileUrl,
                                mat.fileName || `${mat.title}.pdf`,
                                mat.id
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
              <div className="flex items-center gap-4 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                <span>{filteredChapters.length} Chapters</span>
                <span>{materials.length} Resources</span>
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
                    onChange={(e) => setSelectedCohort(e.target.value)}
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
                    <option value="all">All Subjects</option>
                    {subjects.map((s) => (
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
                {subjects.map((s) => (
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
                  const chItems = materials.filter((m) => m.chapterId === ch.id);
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
          </>
        )}
      </ResponsiveContainer>

      {/* Inline PDF / Image / Video Preview Modal */}
      {previewMaterial && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewMaterial.title}`}
        >
          <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F97316] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {previewMaterial.sectionName}
                </p>
                <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white truncate">
                  {previewMaterial.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isVideoMaterial(previewMaterial) && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadDocument(
                          previewMaterial.fileUrl,
                          previewMaterial.fileName || `${previewMaterial.title}.pdf`,
                          previewMaterial.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                    {resolvedPreviewUrl && !previewMaterial.fileUrl.startsWith('prepskm-blob://') && (
                      <a
                        href={resolvedPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B1B3B] text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Tab
                      </a>
                    )}
                  </>
                )}
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setPreviewMaterial(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-auto space-y-4">
              {isVideoMaterial(previewMaterial) ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                  {activeYoutubeId ? (
                    <iframe
                      title={previewMaterial.title}
                      src={`https://www.youtube.com/embed/${activeYoutubeId}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video
                      src={resolvedPreviewUrl || previewMaterial.fileUrl}
                      poster={previewMaterial.thumbnailUrl}
                      controls
                      controlsList="nodownload"
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                      autoPlay
                      className="w-full h-full"
                    />
                  )}
                </div>
              ) : previewMaterial.mediaType === 'image' ||
                previewMaterial.mimeType?.startsWith('image/') ? (
                <img
                  src={resolvedPreviewUrl || previewMaterial.fileUrl}
                  alt={previewMaterial.title}
                  className="max-h-[70vh] mx-auto rounded-lg object-contain"
                />
              ) : (
                <iframe
                  title={previewMaterial.title}
                  src={resolvedPreviewUrl || previewMaterial.fileUrl}
                  className="w-full h-[68vh] rounded-xl bg-white border border-slate-200 dark:border-slate-800"
                />
              )}

              {previewMaterial.description && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {previewMaterial.description}
                </p>
              )}

              {/* Attached PDFs / Study Notes for Video (Downloadable) */}
              {previewMaterial.attachments && previewMaterial.attachments.length > 0 && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#F97316] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attached PDFs &amp; Class Notes ({previewMaterial.attachments.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {previewMaterial.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0B1B3B] dark:text-white truncate">
                            {att.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {att.fileName || 'PDF Document'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void handleDownloadDocument(
                              att.fileUrl,
                              att.fileName || `${att.title}.pdf`,
                              previewMaterial.id
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
