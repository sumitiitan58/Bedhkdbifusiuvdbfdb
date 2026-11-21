import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
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
  getHierarchicalMaterialPath,
  getMaterialSlug,
  stripChapterNumberPrefix,
} from '../utils/seoHelpers';
import { playClick } from '../utils/soundEffects';

export default function MaterialDetailPage() {
  const { slug, classSlug, chapterSlug } = useParams<{
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
    return (
      materials.find(
        (m) =>
          getMaterialSlug(m) === normalized ||
          m.id.toLowerCase() === normalized ||
          (m.seoSlug && m.seoSlug.toLowerCase() === normalized)
      ) ?? null
    );
  }, [materials, activeSlug]);

  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
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
          description="Browse free chapter-wise JEE Main, JEE Advanced & NEET UG study materials and concise notes on PREPSKM.IN."
          canonicalPath="/materials"
        />
        <ResponsiveContainer size="narrow" className="py-16">
          <ReusableCard className="text-center space-y-4">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h1 className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white">
              Study Material Not Found
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This chapter PDF may have been moved or renamed. Browse all 82+ JEE, NEET &amp; Board chapter materials below.
            </p>
            <ReusableButton variant="primary" size="sm" to="/materials">
              Browse All Study Materials
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

  const sectionLabel = material.sectionName || 'Concise Notes';
  const pageTitle = `${cleanChapterName} ${sectionLabel} & PDF – ${primaryCohortLabel} ${subjectName} | PREPSKM.IN`;

  const metaDescription =
    material.seoDescription?.trim() ||
    `Download free ${cleanChapterName} concise notes, formula sheets, PYQs, and attempt NTA-grade CBT mocks for ${primaryCohortLabel} on PREPSKM.IN.`;

  const seoSummary = buildMaterialSeoSummary({
    title: material.title,
    subjectName,
    chapterName: cleanChapterName,
    sectionName: sectionLabel,
    cohortLabels,
    description: material.description,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        name: pageTitle,
        headline: material.title,
        description: metaDescription,
        educationalLevel: cohortLabels.join(', ') || primaryCohortLabel,
        learningResourceType: sectionLabel,
        inLanguage: 'en-IN',
        about: {
          '@type': 'Thing',
          name: `${subjectName} - ${cleanChapterName}`,
        },
        url: `${CANONICAL_ORIGIN}${routePath}`,
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
            name: 'Study Materials',
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
            name: `${cleanChapterName} ${sectionLabel}`,
            item: `${CANONICAL_ORIGIN}${routePath}`,
          },
        ],
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
          `${cleanChapterName}, ${cleanChapterName} concise notes, ${subjectName}, ${primaryCohortLabel}, ${sectionLabel}, PREPSKM.IN, JEE notes, NEET notes`
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
            Materials
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
              {sectionLabel}
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
            {cleanChapterName} {sectionLabel} &amp; PDF — {primaryCohortLabel} {subjectName}
          </h1>

          {cohortLabels.length > 0 && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Applicable Tracks:{' '}
              <strong className="text-slate-700 dark:text-slate-200">{cohortLabels.join(' · ')}</strong>
            </p>
          )}
        </ReusableCard>

        {/* Full Multi-Page PDF Viewer */}
        {material.mediaType === 'image' || material.mimeType?.startsWith('image/') ? (
          <ReusableCard padding="sm" className="text-center rounded-2xl border-slate-200/80">
            <img
              src={resolvedUrl || material.fileUrl}
              alt={material.title}
              className="max-h-[75vh] mx-auto rounded-lg object-contain"
            />
          </ReusableCard>
        ) : (
          <FullPdfViewer
            url={resolvedUrl || material.fileUrl}
            title={material.title}
            subtitle={`${subjectName} · ${sectionLabel}`}
            fileName={material.fileName}
            materialId={material.id}
            heightClassName="h-[74vh]"
            onDownloadApproved={() => recordMaterialView(material.id)}
          />
        )}

        {/* Semantic Key Concepts & Revision Checklist for Googlebot + Students */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <ReusableCard className="lg:col-span-8 space-y-3 rounded-2xl border-slate-200/80">
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              Key Concepts &amp; Formula Overview — {cleanChapterName}
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {seoSummary}
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold">
              <Link to="/cbt-mocks" className="text-[#2563EB] dark:text-sky-400 hover:underline">
                Attempt NTA CBT Mock Tests →
              </Link>
              <Link to="/dpp" className="text-[#F97316] hover:underline">
                Practice Chapter-Wise DPPs →
              </Link>
              <Link
                to={`/materials?track=${encodeURIComponent(primaryCohortId)}`}
                className="text-slate-600 dark:text-slate-300 hover:underline"
              >
                Explore All {primaryCohortLabel} Notes →
              </Link>
            </div>
          </ReusableCard>

          <ReusableCard className="lg:col-span-4 space-y-3 rounded-2xl border-slate-200/80">
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
              Included PDFs &amp; Revision Checklist
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>High-resolution multi-page {sectionLabel} PDF for {cleanChapterName}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>Aligned with latest NTA JEE Main, JEE Advanced &amp; NCERT syllabus</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>Instant bookmarking and offline PDF download on mobile &amp; desktop</span>
              </li>
            </ul>
          </ReusableCard>
        </div>

        {/* Related Crawlable Chapter Links */}
        {relatedMaterials.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
              More {subjectName} Concise Notes &amp; Study Materials
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
                    <p className="text-[11px] font-semibold text-[#F97316]">{rel.sectionName}</p>
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
