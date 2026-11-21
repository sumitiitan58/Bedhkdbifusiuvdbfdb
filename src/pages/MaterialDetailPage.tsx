import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
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
import { usePlatformData } from '../context/PlatformDataContext';
import { resolveAssetUrl } from '../utils/instantUpload';
import {
  buildMaterialSeoSummary,
  CANONICAL_ORIGIN,
  getMaterialRoutePath,
  getMaterialSlug,
} from '../utils/seoHelpers';
import { playClick } from '../utils/soundEffects';

export default function MaterialDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const {
    allCohorts,
    subjects,
    chapters,
    materials,
    progress,
    toggleMaterialBookmark,
    recordMaterialView,
  } = usePlatformData();

  const material = useMemo(() => {
    if (!slug) return null;
    const normalized = slug.toLowerCase();
    return (
      materials.find((m) => getMaterialSlug(m) === normalized || m.id.toLowerCase() === normalized) ??
      null
    );
  }, [materials, slug]);

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
          title="Study Material Not Found - Prepskm"
          description="Browse free chapter-wise JEE Main, JEE Advanced & NEET UG study materials and concise notes on Prepskm."
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

  const routePath = getMaterialRoutePath(material);
  const subjectName = subject?.name ?? 'Science';
  const chapterName = chapter?.name ?? material.title;
  const isBookmarked = progress.bookmarkedMaterials.includes(material.id);

  const seoSummary = buildMaterialSeoSummary({
    title: material.title,
    subjectName,
    chapterName,
    sectionName: material.sectionName,
    cohortLabels,
    description: material.description,
  });

  const metaDescription =
    material.seoDescription ||
    `Download free ${material.title} (${subjectName} · ${chapterName}) for ${cohortLabels.slice(0, 2).join(', ') || 'JEE & NEET'} on Prepskm.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: material.title,
    description: metaDescription,
    educationalLevel: cohortLabels.join(', ') || 'Class 11 & Class 12 JEE / NEET',
    learningResourceType: material.sectionName,
    about: {
      '@type': 'Thing',
      name: `${subjectName} - ${chapterName}`,
    },
    url: `${CANONICAL_ORIGIN}${routePath}`,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Prepskm',
      url: CANONICAL_ORIGIN,
    },
    isAccessibleForFree: true,
  };

  return (
    <PageLayout>
      <SeoHead
        title={`${material.title} - Prepskm`}
        description={metaDescription}
        canonicalPath={routePath}
        keywords={
          material.seoKeywords ||
          `${chapterName}, ${subjectName}, ${material.sectionName}, Prepskm, JEE notes, NEET notes`
        }
        jsonLd={jsonLd}
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/materials"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#0B1B3B] dark:text-white bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 hover:border-[#2563EB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Study Materials
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                toggleMaterialBookmark(material.id);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isBookmarked
                  ? 'bg-[#F97316] text-white border-[#F97316]'
                  : 'bg-white dark:bg-[#111A2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <a
              href={resolvedUrl || material.fileUrl}
              download={material.fileName || `${material.title}.pdf`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        </div>

        {/* Header Metadata */}
        <ReusableCard className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-[#F97316] inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {material.sectionName}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[#2563EB] dark:text-sky-400">{subjectName}</span>
            {chapter && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-600 dark:text-slate-300">{chapter.name}</span>
              </>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white leading-tight">
            {material.title}
          </h1>

          {cohortLabels.length > 0 && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Target Tracks: <strong className="text-slate-700 dark:text-slate-200">{cohortLabels.join(' · ')}</strong>
            </p>
          )}
        </ReusableCard>

        {/* Full Multi-Page PDF Viewer */}
        {material.mediaType === 'image' || material.mimeType?.startsWith('image/') ? (
          <ReusableCard padding="sm" className="text-center">
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
            fileName={material.fileName}
            heightClassName="h-[74vh]"
          />
        )}

        {/* SEO-Friendly 150-Word Chapter Overview & Syllabus Guide for Googlebot & Students */}
        <ReusableCard className="space-y-3">
          <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            Chapter Overview &amp; Revision Summary — {chapterName}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {seoSummary}
          </p>
          <div className="pt-2 flex flex-wrap gap-3 text-xs font-semibold">
            <Link to="/cbt-mocks" className="text-[#2563EB] dark:text-sky-400 hover:underline">
              Attempt NTA CBT Mock Tests →
            </Link>
            <Link to="/dpp" className="text-[#F97316] hover:underline">
              Practice Chapter-Wise DPPs →
            </Link>
          </div>
        </ReusableCard>

        {/* Related Crawlable Chapter Links */}
        {relatedMaterials.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
              More {subjectName} Study Materials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {relatedMaterials.map((rel) => (
                <Link
                  key={rel.id}
                  to={getMaterialRoutePath(rel)}
                  className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-3.5 hover:border-[#2563EB] transition-colors"
                >
                  <p className="text-[11px] font-semibold text-[#F97316]">{rel.sectionName}</p>
                  <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white mt-0.5 line-clamp-2">
                    {rel.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
