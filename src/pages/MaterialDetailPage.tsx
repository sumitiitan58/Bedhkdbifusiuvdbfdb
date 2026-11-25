import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { FullPdfViewer } from '../components/materials/FullPdfViewer';
import { NativeBannerAd } from '../components/ads/NativeBannerAd';
import { GuestDownloadBadge } from '../components/monetization/GuestDownloadBadge';
import { useDownloadGate } from '../context/DownloadGateContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { resolveAssetUrl } from '../utils/instantUpload';
import {
  buildMaterialSeoSummary,
  CANONICAL_ORIGIN,
  generateCleanSlug,
  getHierarchicalMaterialPath,
  getMaterialSlug,
  resolveSubjectSlug,
  stripChapterNumberPrefix,
} from '../utils/seoHelpers';
import { playClick } from '../utils/soundEffects';

function getFriendlyResourceTypeLabel(sectionName?: string, title?: string): string {
  const combined = `${sectionName ?? ''} ${title ?? ''}`.toLowerCase();
  if (combined.includes('formula')) return 'Formula Sheet';
  if (combined.includes('pyq') || combined.includes('previous year')) return 'PYQ Archive';
  return 'Chapter Notes';
}

export default function MaterialDetailPage() {
  const { slug, classSlug, subjectSlug, chapterSlug } = useParams<{
    slug?: string;
    classSlug?: string;
    subjectSlug?: string;
    chapterSlug?: string;
  }>();

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

  const activeSlug = chapterSlug || slug || '';

  const material = useMemo(() => {
    if (!activeSlug) return null;
    const normalized = activeSlug.toLowerCase();

    const exact = materials.find(
      (m) =>
        getMaterialSlug(m) === normalized ||
        m.id.toLowerCase() === normalized ||
        (m.seoSlug && m.seoSlug.toLowerCase() === normalized)
    );
    if (exact) return exact;

    // Support clean chapter slug routes like /materials/class-12-jee/physics/electrostatics
    const normalizedSub = subjectSlug?.toLowerCase();
    const matchedChapter = chapters.find((ch) => {
      const chSlug = generateCleanSlug(stripChapterNumberPrefix(ch.name));
      const matchesName = chSlug === normalized || chSlug.includes(normalized);
      if (!matchesName) return false;
      if (normalizedSub) {
        const subName = subjects.find((s) => s.id === ch.subjectId)?.name;
        if (resolveSubjectSlug(ch.subjectId, subName) !== normalizedSub) return false;
      }
      if (classSlug && ch.cohorts.length > 0 && !ch.cohorts.includes(classSlug)) {
        return false;
      }
      return true;
    });

    if (matchedChapter) {
      const byChapter = materials.find((m) => m.chapterId === matchedChapter.id);
      if (byChapter) return byChapter;
    }

    return (
      materials.find((m) => {
        const mSlug = getMaterialSlug(m);
        if (!mSlug.includes(normalized)) return false;
        if (normalizedSub) {
          const subName = subjects.find((s) => s.id === m.subjectId)?.name;
          if (resolveSubjectSlug(m.subjectId, subName) !== normalizedSub) return false;
        }
        return true;
      }) ?? null
    );
  }, [materials, activeSlug, chapters, classSlug, subjectSlug, subjects]);

  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [openFullScreen, setOpenFullScreen] = useState<boolean>(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    setOpenFullScreen(false);
    if (!material) {
      setResolvedUrl('');
      return;
    }
    recordMaterialView(material.id);
    resolveAssetUrl(material.fileUrl).then((url) => {
      if (active) setResolvedUrl(url || material.fileUrl);
    });
    return () => {
      active = false;
    };
  }, [material, recordMaterialView]);

  const subject = material ? subjects.find((s) => s.id === material.subjectId) : undefined;
  const chapter = material ? chapters.find((c) => c.id === material.chapterId) : undefined;

  const cohortLabels = useMemo(() => {
    if (!material) return [];
    return material.cohorts
      .map((cid) => allCohorts.find((c) => c.id === cid)?.label ?? cid)
      .filter(Boolean);
  }, [allCohorts, material]);

  const primaryCohortId = useMemo(() => {
    if (!material) return 'class-11-jee';
    if (classSlug && material.cohorts.includes(classSlug)) return classSlug;
    return material.cohorts[0] ?? 'class-11-jee';
  }, [classSlug, material]);

  const primaryCohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === primaryCohortId)?.label ?? cohortLabels[0] ?? 'JEE & NEET',
    [allCohorts, cohortLabels, primaryCohortId]
  );

  const relatedMaterials = useMemo(() => {
    if (!material) return [];
    return materials
      .filter(
        (m) =>
          m.id !== material.id &&
          (m.subjectId === material.subjectId || m.chapterId === material.chapterId)
      )
      .slice(0, 6);
  }, [material, materials]);

  if (!material) {
    return (
      <PageLayout>
        <SeoHead
          title="Study Material Not Found | PREPSKM.IN"
          description="Browse free chapter-wise JEE Main, JEE Advanced & NEET UG notes and formula sheets on PREPSKM.IN."
          canonicalPath="/materials"
        />
        <ResponsiveContainer size="narrow" className="py-16">
          <ReusableCard className="text-center space-y-4">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h1 className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white">
              Study Material Not Found
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This chapter PDF may have been moved or renamed. Browse all JEE, NEET &amp; Board chapter notes below.
            </p>
            <ReusableButton variant="primary" size="sm" to="/materials">
              Browse All Chapter Notes
            </ReusableButton>
          </ReusableCard>
        </ResponsiveContainer>
      </PageLayout>
    );
  }

  const subjectName = subject?.name ?? 'Science';
  const rawChapterName = chapter?.name ?? material.title;
  const cleanChapterName = stripChapterNumberPrefix(rawChapterName);
  const routePath = getHierarchicalMaterialPath(material, {
    subjectName,
    cohortId: primaryCohortId,
  });
  const isBookmarked = progress.bookmarkedMaterials.includes(material.id);
  const isImage = material.mediaType === 'image' || material.mimeType?.startsWith('image/');

  const resourceLabel = getFriendlyResourceTypeLabel(material.sectionName, material.title);
  const rawSeoTitle = `${cleanChapterName} ${resourceLabel} – ${subjectName} | Prepskm`;
  const pageTitle =
    rawSeoTitle.length <= 60
      ? rawSeoTitle
      : `${cleanChapterName.slice(0, Math.max(18, 42 - resourceLabel.length)).trim()} ${resourceLabel} | Prepskm`;

  const defaultDesc = `Download free ${cleanChapterName} ${resourceLabel.toLowerCase()} PDF for ${primaryCohortLabel} ${subjectName}. Includes formulas, NCERT highlights, and exam revision tips.`;
  const metaDescription = (material.seoDescription?.trim() || defaultDesc).slice(0, 155);

  const seoSummary = buildMaterialSeoSummary({
    title: material.title,
    subjectName,
    chapterName: cleanChapterName,
    sectionName: resourceLabel,
    cohortLabels,
    description: material.description,
  });

  const chapterFaqs = [
    {
      q: `Is this ${cleanChapterName} ${resourceLabel.toLowerCase()} PDF aligned with the latest NTA syllabus?`,
      a: `Yes. This ${cleanChapterName} ${resourceLabel.toLowerCase()} for ${primaryCohortLabel} ${subjectName} follows the latest NCERT and NTA JEE/NEET syllabus, focusing on high-weightage formulas, core concepts, and common exam traps.`,
    },
    {
      q: `Can I download ${cleanChapterName} notes for offline study on mobile or desktop?`,
      a: `Yes. You can read every page inside the full-screen viewer or click the Download PDF button above to save ${cleanChapterName} ${resourceLabel.toLowerCase()} for offline revision.`,
    },
    {
      q: `How should I practice ${cleanChapterName} after revising these notes?`,
      a: `After reviewing the key formulas and concepts in ${cleanChapterName}, solve timed chapter-wise DPPs and attempt a full-syllabus NTA CBT mock test on PREPSKM.IN to build speed and eliminate negative marking.`,
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['LearningResource', 'DigitalDocument'],
        name: pageTitle,
        headline: material.title,
        description: metaDescription,
        educationalLevel: cohortLabels.join(', ') || primaryCohortLabel,
        learningResourceType: resourceLabel,
        encodingFormat: 'application/pdf',
        inLanguage: 'en-IN',
        about: {
          '@type': 'Thing',
          name: `${subjectName} - ${cleanChapterName}`,
        },
        url: `${CANONICAL_ORIGIN}${routePath}`,
        contentUrl: material.fileUrl.startsWith('http')
          ? material.fileUrl
          : `${CANONICAL_ORIGIN}${material.fileUrl}`,
        provider: {
          '@type': 'EducationalOrganization',
          name: 'PREPSKM.IN',
          url: CANONICAL_ORIGIN,
        },
        isAccessibleForFree: true,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${CANONICAL_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Chapter Notes & Study Materials',
            item: `${CANONICAL_ORIGIN}/materials`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: primaryCohortLabel,
            item: `${CANONICAL_ORIGIN}/materials?track=${encodeURIComponent(primaryCohortId)}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: `${cleanChapterName} ${resourceLabel}`,
            item: `${CANONICAL_ORIGIN}${routePath}`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: chapterFaqs.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <PageLayout>
      <SeoHead
        title={pageTitle}
        description={metaDescription}
        canonicalPath={routePath}
        keywords={
          material.seoKeywords ||
          `${cleanChapterName}, ${cleanChapterName} notes pdf, ${subjectName}, ${primaryCohortLabel}, ${resourceLabel}, PREPSKM.IN, JEE notes, NEET notes`
        }
        jsonLd={jsonLd}
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Semantic Crawl-Friendly Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/materials" className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors">
            Chapter Notes
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            to={`/materials?track=${encodeURIComponent(primaryCohortId)}`}
            className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
          >
            {primaryCohortLabel}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[#0B1B3B] dark:text-slate-200 font-semibold truncate">
            {cleanChapterName}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/materials?track=${encodeURIComponent(primaryCohortId)}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#0B1B3B] dark:text-white bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 hover:border-[#2563EB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All {primaryCohortLabel} Chapters
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="hidden sm:inline-flex">
              <GuestDownloadBadge />
            </span>
            {!isImage && (
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setOpenFullScreen(true);
                }}
                data-testid="detail-open-fullscreen-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0B1B3B] hover:bg-[#162C5B] dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                Open Full-Screen PDF
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playClick();
                toggleMaterialBookmark(material.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isBookmarked
                  ? 'bg-[#F97316] text-white border-[#F97316]'
                  : 'bg-white dark:bg-[#111A2E] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#2563EB]'
              }`}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button
              type="button"
              onClick={() =>
                void requestPdfDownload({
                  url: resolvedUrl || material.fileUrl,
                  fileName: material.fileName || `${material.title}.pdf`,
                  title: material.title,
                  materialId: material.id,
                  onApproved: () => recordMaterialView(material.id),
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Header Metadata */}
        <ReusableCard className="space-y-3 rounded-2xl border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-[#F97316] inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {resourceLabel}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[#2563EB] dark:text-sky-400">{subjectName}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-slate-600 dark:text-slate-300">{primaryCohortLabel}</span>
            {chapter && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {chapter.weightageMarks} Marks ({chapter.difficulty})
                </span>
              </>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white leading-tight">
            {cleanChapterName} {resourceLabel} PDF — {primaryCohortLabel} {subjectName}
          </h1>

          {cohortLabels.length > 0 && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Applicable Tracks:{' '}
              <strong className="text-slate-700 dark:text-slate-200">{cohortLabels.join(' · ')}</strong>
            </p>
          )}
        </ReusableCard>

        {/* Full-Width Multi-Page PDF Viewer (with 1-click True Full-Screen Portal) */}
        {isImage ? (
          <ReusableCard padding="sm" className="text-center rounded-2xl border-slate-200/80">
            <img
              src={resolvedUrl || material.fileUrl}
              alt={material.title}
              className="max-h-[80vh] mx-auto rounded-lg object-contain"
            />
          </ReusableCard>
        ) : (
          <FullPdfViewer
            url={resolvedUrl || material.fileUrl}
            title={material.title}
            subtitle={`${subjectName} · ${resourceLabel}`}
            fileName={material.fileName}
            materialId={material.id}
            heightClassName="h-[80vh]"
            isBookmarked={isBookmarked}
            onToggleBookmark={() => toggleMaterialBookmark(material.id)}
            onDownloadApproved={() => recordMaterialView(material.id)}
          />
        )}

        {/* True Full-Screen Portal PDF Reader when launched from Detail Header */}
        {openFullScreen && !isImage && (
          <FullPdfViewer
            url={resolvedUrl || material.fileUrl}
            title={material.title}
            subtitle={`${subjectName} · ${resourceLabel}`}
            fileName={material.fileName}
            materialId={material.id}
            fullPage
            isBookmarked={isBookmarked}
            onToggleBookmark={() => toggleMaterialBookmark(material.id)}
            onClose={() => setOpenFullScreen(false)}
            onDownloadApproved={() => recordMaterialView(material.id)}
          />
        )}

        {/* Visible Topic Overview & Chapter Study FAQs (150-300 word SEO + student guide) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <ReusableCard className="lg:col-span-7 space-y-3 rounded-2xl border-slate-200/80">
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
              {cleanChapterName} Topic Overview &amp; Revision Guide
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {seoSummary}
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 text-xs font-semibold">
              <Link to="/cbt-mocks" className="text-[#2563EB] dark:text-sky-400 hover:underline">
                Practice NTA CBT Mocks →
              </Link>
              <Link to="/dpp" className="text-[#2563EB] dark:text-sky-400 hover:underline">
                Solve Chapter DPPs →
              </Link>
              <Link to="/preps-ai" className="text-[#F97316] hover:underline">
                Ask Preps AI a Doubt →
              </Link>
            </div>
          </ReusableCard>

          <ReusableCard className="lg:col-span-5 space-y-3 rounded-2xl border-slate-200/80">
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
              Chapter Study FAQs
            </h2>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {chapterFaqs.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={item.q} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setOpenFaqIdx(isOpen ? null : idx);
                      }}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-2 text-left text-xs sm:text-sm font-bold text-[#0B1B3B] dark:text-white"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                          isOpen ? 'rotate-180 text-[#F97316]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ReusableCard>
        </div>

        {/* Related Crawlable Chapter Links */}
        {relatedMaterials.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
              More {subjectName} Chapter Notes &amp; Formula Sheets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {relatedMaterials.map((rel) => {
                const relSubjectName = subjects.find((s) => s.id === rel.subjectId)?.name ?? subjectName;
                const relPath = getHierarchicalMaterialPath(rel, {
                  subjectName: relSubjectName,
                  cohortId: rel.cohorts[0] ?? primaryCohortId,
                });
                return (
                  <Link
                    key={rel.id}
                    to={relPath}
                    className="block rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-4 hover:border-[#2563EB] hover:-translate-y-0.5 transition-all"
                  >
                    <p className="text-[11px] font-semibold text-[#F97316]">
                      {getFriendlyResourceTypeLabel(rel.sectionName, rel.title)}
                    </p>
                    <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white mt-0.5 line-clamp-2">
                      {rel.title}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        <NativeBannerAd />
      </ResponsiveContainer>
    </PageLayout>
  );
}
