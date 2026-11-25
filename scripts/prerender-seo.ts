import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CANONICAL_ORIGIN,
  buildMaterialSeoSummary,
  buildMockTestSeoSummary,
  buildSitemapXml,
  generateCleanSlug,
  getHierarchicalMaterialPath,
  getHierarchicalMockTestPath,
  resolveSubjectSlug,
  stripChapterNumberPrefix,
  type SitemapUrlEntry,
} from '../src/utils/seoHelpers';
import {
  ABOUT_FAQS,
  buildChapterFaqs,
  buildChapterSeoDescription,
  buildChapterSeoTitle,
  buildFaqPageJsonLd,
  buildTestSeoDescription,
  buildTestSeoTitle,
} from '../src/data/seoContent';
import {
  JEE_CONCISE_CHAPTERS,
  JEE_CONCISE_MATERIALS,
} from '../src/data/jeeConciseNotesCatalog';
import {
  PCMB_FORMULA_CHAPTERS,
  PCMB_FORMULA_MATERIALS,
} from '../src/data/pcmbFormulaSheetsCatalog';
import {
  STARTER_CHAPTERS,
  STARTER_MATERIALS,
  STARTER_SUBJECTS,
  STARTER_TESTS,
} from '../src/services/starterCatalog';
import {
  flattenClassGroupsToCohorts,
  STARTER_CLASS_GROUPS,
} from '../src/services/platformRegistry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const ALL_COHORTS = flattenClassGroupsToCohorts(STARTER_CLASS_GROUPS);
const ALL_MATERIALS = [
  ...PCMB_FORMULA_MATERIALS,
  ...JEE_CONCISE_MATERIALS,
  ...STARTER_MATERIALS,
];
const ALL_CHAPTERS = [
  ...PCMB_FORMULA_CHAPTERS,
  ...JEE_CONCISE_CHAPTERS,
  ...STARTER_CHAPTERS,
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCohortLabel(cohortId?: string): string {
  if (!cohortId) return 'JEE & NEET';
  return ALL_COHORTS.find((c) => c.id === cohortId)?.label ?? cohortId;
}

function getSubjectName(subjectId?: string): string {
  if (!subjectId) return 'Science';
  const found = STARTER_SUBJECTS.find((s) => s.id === subjectId);
  if (found) return found.name;
  if (subjectId === 'subj-mathematics') return 'Mathematics';
  if (subjectId === 'subj-physics') return 'Physics';
  if (subjectId === 'subj-chemistry') return 'Chemistry';
  if (subjectId === 'subj-biology') return 'Biology';
  return subjectId.replace(/^subj-/i, '');
}

interface PrerenderPage {
  outputPath: string;
  canonicalPath: string;
  title: string;
  description: string;
  jsonLd?: Record<string, unknown>;
  bodyHtml: string;
}

function buildShellHtml(params: {
  heading: string;
  eyebrow: string;
  intro: string;
  extraSectionsHtml?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}): string {
  const breadcrumbHtml =
    params.breadcrumbs && params.breadcrumbs.length > 0
      ? `<nav aria-label="Breadcrumb" style="font-size:13px;margin-bottom:14px;color:#475569;">${params.breadcrumbs
          .map((item) =>
            item.href
              ? `<a href="${escapeHtml(item.href)}" style="color:#2563EB;text-decoration:none;">${escapeHtml(item.label)}</a>`
              : `<span>${escapeHtml(item.label)}</span>`
          )
          .join(' &rsaquo; ')}</nav>`
      : '';

  return `<div style="font-family:'DM Sans',system-ui,sans-serif;max-width:1120px;margin:0 auto;padding:24px 16px;color:#0B1B3B;">
  <header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid #E2E8F0;">
    <a href="/" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#0B1B3B;font-weight:800;font-size:20px;">
      <img src="/logo-96.png" alt="Prepskm Logo" width="38" height="38" />
      <span>prep<span style="color:#F97316;">skm</span>.in</span>
    </a>
    <nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:14px;font-size:14px;font-weight:600;">
      <a href="/" style="color:#2563EB;text-decoration:none;">Dashboard</a>
      <a href="/cbt-mocks" style="color:#2563EB;text-decoration:none;">All Tests (CBT)</a>
      <a href="/materials" style="color:#2563EB;text-decoration:none;">Study Materials</a>
      <a href="/dpp" style="color:#2563EB;text-decoration:none;">Chapter DPPs</a>
      <a href="/analytics" style="color:#2563EB;text-decoration:none;">Test Analysis</a>
      <a href="/preps-ai" style="color:#2563EB;text-decoration:none;">Preps AI</a>
      <a href="/about" style="color:#2563EB;text-decoration:none;">About Prepskm</a>
    </nav>
  </header>
  <main style="padding:28px 0;">
    ${breadcrumbHtml}
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#F97316;margin:0 0 8px;">${escapeHtml(params.eyebrow)}</p>
    <h1 style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:30px;line-height:1.2;font-weight:800;margin:0 0 12px;color:#0B1B3B;">${escapeHtml(params.heading)}</h1>
    <p style="font-size:15px;line-height:1.65;color:#475569;max-width:780px;margin:0 0 20px;">${escapeHtml(params.intro)}</p>
    ${params.extraSectionsHtml ?? ''}
  </main>
  <footer style="padding-top:16px;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;">
    <span>© Prepskm (prepskm.in) — Built for Indian students by Sumit (@unfiltereddsumit)</span>
    <span>
      <a href="/materials" style="color:#2563EB;text-decoration:none;margin-right:12px;">Study Materials</a>
      <a href="/cbt-mocks" style="color:#2563EB;text-decoration:none;margin-right:12px;">CBT Mocks</a>
      <a href="/dpp" style="color:#2563EB;text-decoration:none;margin-right:12px;">Chapter DPPs</a>
      <a href="/about" style="color:#2563EB;text-decoration:none;">About Prepskm</a>
    </span>
  </footer>
</div>`;
}

function injectPageIntoTemplate(template: string, page: PrerenderPage): string {
  const safeTitle = escapeHtml(page.title);
  const safeDesc = escapeHtml(page.description);
  const canonicalUrl = `${CANONICAL_ORIGIN}${page.canonicalPath}`;

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/i,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:url"[\s\S]*?\/>/i,
      `<meta property="og:url" content="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+property="og:title"[\s\S]*?\/>/i,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/i,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"[\s\S]*?\/>/i,
      `<meta name="twitter:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
      `<meta name="twitter:description" content="${safeDesc}" />`
    );

  if (page.jsonLd) {
    const ldTag = `    <script id="prepskm-ssr-ld" type="application/ld+json">${JSON.stringify(page.jsonLd)}</script>\n  </head>`;
    html = html.replace(/<\/head>/i, ldTag);
  }

  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>\s*(?=<script\b)/i,
    `<div id="root">${page.bodyHtml}</div>\n    `
  );

  return html;
}

function writePrerenderedFile(routePath: string, html: string): void {
  const clean = routePath.replace(/^\/+|\/+$/g, '');
  if (!clean) return;
  const targetDir = path.join(DIST_DIR, clean);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
}

function main() {
  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error('dist/index.html not found. Run `vite build` before prerender-seo.ts.');
  }

  const baseTemplate = fs.readFileSync(templatePath, 'utf-8');
  const todayIso = new Date().toISOString().slice(0, 10);
  const toIsoDate = (val: unknown): string =>
    typeof val === 'string' && val.length >= 10 ? val.slice(0, 10) : todayIso;

  const pages: PrerenderPage[] = [];
  const sitemapEntries: SitemapUrlEntry[] = [
    { loc: `${CANONICAL_ORIGIN}/`, lastmod: todayIso, changefreq: 'daily', priority: '1.0' },
    { loc: `${CANONICAL_ORIGIN}/cbt-mocks`, lastmod: todayIso, changefreq: 'daily', priority: '0.95' },
    { loc: `${CANONICAL_ORIGIN}/materials`, lastmod: todayIso, changefreq: 'daily', priority: '0.95' },
    { loc: `${CANONICAL_ORIGIN}/dpp`, lastmod: todayIso, changefreq: 'daily', priority: '0.9' },
    { loc: `${CANONICAL_ORIGIN}/analytics`, lastmod: todayIso, changefreq: 'weekly', priority: '0.8' },
    { loc: `${CANONICAL_ORIGIN}/mistakes`, lastmod: todayIso, changefreq: 'weekly', priority: '0.8' },
    { loc: `${CANONICAL_ORIGIN}/preps-ai`, lastmod: todayIso, changefreq: 'weekly', priority: '0.8' },
    { loc: `${CANONICAL_ORIGIN}/lectures`, lastmod: todayIso, changefreq: 'weekly', priority: '0.75' },
    { loc: `${CANONICAL_ORIGIN}/about`, lastmod: todayIso, changefreq: 'monthly', priority: '0.7' },
  ];

  // 1. Top-level public routes
  const aboutFaqHtml = `<section style="margin-top:24px;"><h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Frequently Asked Questions</h2>${ABOUT_FAQS.map(
    (faq) =>
      `<article style="margin-bottom:14px;padding:14px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;"><h3 style="font-size:15px;font-weight:700;margin:0 0 6px;">${escapeHtml(
        faq.q
      )}</h3><p style="font-size:14px;line-height:1.6;color:#475569;margin:0;">${escapeHtml(
        faq.a
      )}</p></article>`
  ).join('')}</section>`;

  pages.push(
    {
      outputPath: '/materials',
      canonicalPath: '/materials',
      title: 'Study Materials, Notes & Inline DPPs | Prepskm',
      description:
        'Download free chapter-wise JEE, NEET & Board concise notes, formula sheets, and PYQs — plus launch timed Chapter DPPs directly inline on Prepskm.',
      bodyHtml: buildShellHtml({
        eyebrow: 'Chapter-Wise Study Library & Inline DPPs',
        heading: 'JEE, NEET & Board Chapter Notes, Formula Sheets & Inline DPPs',
        intro:
          'Browse structured NCERT-aligned chapter notes, high-yield formula sheets, mind maps, and PYQs across Physics, Chemistry, Mathematics, and Biology — and solve timed Chapter DPPs inline.',
      }),
    },
    {
      outputPath: '/cbt-mocks',
      canonicalPath: '/cbt-mocks',
      title: 'Free NTA CBT Mock Tests for JEE & NEET | Prepskm',
      description:
        'Attempt free NTA-pattern JEE Main, JEE Advanced, NEET UG & Board CBT mock tests with +4/-1 marking, live timer, and Prep Score (0–100) analysis.',
      bodyHtml: buildShellHtml({
        eyebrow: 'NTA Computer Based Test Engine',
        heading: 'Free JEE Main, JEE Advanced & NEET UG CBT Mock Tests',
        intro:
          'Practice full-syllabus and part-syllabus mock tests in an authentic NTA CBT exam simulator featuring +4/-1 marking, color-coded question palettes, and instant detailed solutions.',
      }),
    },
    {
      outputPath: '/dpp',
      canonicalPath: '/dpp',
      title: 'Chapter-Wise Daily Practice Problems (DPP) | Prepskm',
      description:
        'Solve timed JEE Main, JEE Advanced & NEET chapter-wise Daily Practice Problems (DPPs) with +4/-1 evaluation, instant scoring, and step-by-step solutions.',
      bodyHtml: buildShellHtml({
        eyebrow: 'Daily Practice Problems',
        heading: 'Chapter-Wise DPPs for JEE, NEET & Class 9–12 Boards',
        intro:
          'Build exam speed and accuracy with focused chapter-wise DPPs covering Single MCQ, Multi-Correct, and Integer numerical questions — also accessible inline inside Study Materials.',
      }),
    },
    {
      outputPath: '/analytics',
      canonicalPath: '/analytics',
      title: 'Prep Score (0–100) & Test Analysis | Prepskm',
      description:
        'Track your calibrated Prep Score (0–100), predicted percentile, pacing breakdown, and export 3-tab analytics to Google Sheets & Google Tasks.',
      bodyHtml: buildShellHtml({
        eyebrow: 'Prep Score (0–100) & Google Workspace Sync',
        heading: 'Prep Score (0–100), Pacing & Google Sheets Test Analysis',
        intro:
          'Inspect every submitted CBT mock and chapter DPP with subject-wise accuracy, pacing diagnostics, Prep Score (0–100) breakdown, Google Sheets export, and Google Tasks study management.',
      }),
    },
    {
      outputPath: '/mistakes',
      canonicalPath: '/mistakes',
      title: 'AI Mistake Notebook & Re-Attempt Sets | Prepskm',
      description:
        'Diagnose error patterns (rushed slips, time-sinks, conceptual gaps) and launch personalized timed re-attempt drills with Preps AI step-by-step fixes.',
      bodyHtml: buildShellHtml({
        eyebrow: 'AI Error Pattern Lab',
        heading: 'AI Mistake Notebook & Personalized Re-Attempt Drills',
        intro:
          'Turn every wrong and skipped question from your CBT mocks and Chapter DPPs into root-cause error diagnostics, personalized timed re-attempt sets, and step-by-step Preps AI fixes.',
      }),
    },
    {
      outputPath: '/preps-ai',
      canonicalPath: '/preps-ai',
      title: 'Preps AI — Live-Context JEE & NEET Mentor | Prepskm',
      description:
        'Compact voice & chat AI mentor synced with your live Prep Score (0–100), streak, and Mistake Notebook for instant JEE, NEET & Board solutions.',
      bodyHtml: buildShellHtml({
        eyebrow: 'Compact AI Study Mentor',
        heading: 'Preps AI — Live-Context JEE, NEET & Board Mentor',
        intro:
          'Solve tough Physics, Chemistry, Maths, and Biology doubts step-by-step in English or Hinglish with an accessible Live Context bar synced to your Prep Score (0–100) and Mistake Notebook.',
      }),
    },
    {
      outputPath: '/lectures',
      canonicalPath: '/lectures',
      title: 'JEE, NEET & Board Concept Video Lectures | Prepskm',
      description:
        'Watch chapter-wise concept revision video lectures for Class 9–12 Boards, JEE Main, JEE Advanced, and NEET UG paired with concise notes and DPPs.',
      bodyHtml: buildShellHtml({
        eyebrow: 'Concept Video Library',
        heading: 'Chapter-Wise Concept Video Lectures on Prepskm',
        intro:
          'Revise key derivations, mechanisms, and exam shortcuts with focused concept lectures paired with downloadable concise PDFs and inline chapter DPPs.',
      }),
    },
    {
      outputPath: '/about',
      canonicalPath: '/about',
      title: 'About Prepskm (@unfiltereddsumit) — JEE & NEET Prep',
      description:
        'Discover how PREPSKM.IN by @unfiltereddsumit unites chapter notes, inline DPPs, NTA CBT mocks, Prep Score (0–100), AI Mistake Lab & Google Workspace.',
      jsonLd: {
        '@context': 'https://schema.org',
        ...buildFaqPageJsonLd(ABOUT_FAQS),
      },
      bodyHtml: buildShellHtml({
        eyebrow: 'Built for Indian Students by @unfiltereddsumit',
        heading: 'About Prepskm — How PREPSKM.IN Helps You Crack JEE, NEET & Boards',
        intro:
          'PREPSKM.IN unites chapter-wise concise notes with inline Chapter DPPs, authentic NTA-pattern CBT mocks, calibrated Prep Score (0–100) with Google Sheets & Tasks sync, AI Mistake Notebook re-attempt sets, and compact Preps AI mentorship.',
        extraSectionsHtml: aboutFaqHtml,
      }),
    }
  );

  // 2. Published Chapter Study Materials + Clean Chapter Slugs
  const seenOutputPaths = new Set<string>(pages.map((p) => p.outputPath));

  for (const material of ALL_MATERIALS) {
    if (material.isPublished === false) continue;

    const subjectName = getSubjectName(material.subjectId);
    const chapter = ALL_CHAPTERS.find((c) => c.id === material.chapterId);
    const cleanChapter = stripChapterNumberPrefix(chapter?.name ?? material.title);
    const primaryCohortId = material.cohorts[0] ?? 'class-11-jee';
    const primaryCohortLabel = getCohortLabel(primaryCohortId);
    const rawLabel = `${material.sectionName ?? ''} ${material.title}`.toLowerCase();
    const resourceLabel = rawLabel.includes('formula')
      ? 'Formula Sheet'
      : rawLabel.includes('pyq') || rawLabel.includes('previous year')
        ? 'PYQ Archive'
        : 'Chapter Notes';

    const canonicalPath = getHierarchicalMaterialPath(material, {
      subjectName,
      cohortId: primaryCohortId,
    });
    const title = buildChapterSeoTitle(cleanChapter, resourceLabel, subjectName);
    const description = buildChapterSeoDescription({
      cleanChapterName: cleanChapter,
      resourceLabel,
      primaryCohortLabel,
      subjectName,
      customDescription: material.seoDescription,
    });
    const summary = buildMaterialSeoSummary({
      title: material.title,
      subjectName,
      chapterName: cleanChapter,
      sectionName: resourceLabel,
      cohortLabels: material.cohorts.map(getCohortLabel),
      description: material.description,
    });
    const chapterFaqs = buildChapterFaqs({
      chapterName: cleanChapter,
      subjectName,
      cohortLabel: primaryCohortLabel,
      resourceLabel,
    });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['LearningResource', 'DigitalDocument'],
          name: title,
          headline: material.title,
          description,
          educationalLevel: material.cohorts.map(getCohortLabel).join(', ') || primaryCohortLabel,
          learningResourceType: resourceLabel,
          encodingFormat: 'application/pdf',
          inLanguage: 'en-IN',
          about: { '@type': 'Thing', name: `${subjectName} - ${cleanChapter}` },
          url: `${CANONICAL_ORIGIN}${canonicalPath}`,
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
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${CANONICAL_ORIGIN}/` },
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
              name: `${cleanChapter} ${resourceLabel}`,
              item: `${CANONICAL_ORIGIN}${canonicalPath}`,
            },
          ],
        },
        buildFaqPageJsonLd(chapterFaqs),
      ],
    };

    const extraSectionsHtml = `<section style="padding:18px;border:1px solid #E2E8F0;border-radius:14px;background:#ffffff;margin-bottom:18px;">
      <h2 style="font-size:19px;font-weight:700;margin:0 0 8px;">Topic Overview &amp; Revision Guide</h2>
      <p style="font-size:14px;line-height:1.65;color:#475569;margin:0 0 12px;">${escapeHtml(summary)}</p>
      <a href="${escapeHtml(material.fileUrl)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0B1B3B;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;">Download ${escapeHtml(cleanChapter)} ${escapeHtml(resourceLabel)} PDF</a>
    </section>
    <section>
      <h2 style="font-size:19px;font-weight:700;margin:0 0 10px;">Chapter Study FAQs</h2>
      ${chapterFaqs
        .map(
          (faq) =>
            `<article style="margin-bottom:12px;padding:14px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;"><h3 style="font-size:15px;font-weight:700;margin:0 0 6px;">${escapeHtml(
              faq.q
            )}</h3><p style="font-size:14px;line-height:1.6;color:#475569;margin:0;">${escapeHtml(
              faq.a
            )}</p></article>`
        )
        .join('')}
    </section>`;

    const bodyHtml = buildShellHtml({
      eyebrow: `${primaryCohortLabel} · ${subjectName} · ${resourceLabel}`,
      heading: `${cleanChapter} ${resourceLabel} PDF — ${primaryCohortLabel} ${subjectName}`,
      intro: description,
      breadcrumbs: [
        { label: 'Home', href: '/' },
        { label: 'Study Materials', href: '/materials' },
        { label: primaryCohortLabel, href: `/materials?track=${encodeURIComponent(primaryCohortId)}` },
        { label: cleanChapter },
      ],
      extraSectionsHtml,
    });

    if (!seenOutputPaths.has(canonicalPath)) {
      seenOutputPaths.add(canonicalPath);
      pages.push({
        outputPath: canonicalPath,
        canonicalPath,
        title,
        description,
        jsonLd,
        bodyHtml,
      });
    }

    sitemapEntries.push({
      loc: `${CANONICAL_ORIGIN}${canonicalPath}`,
      lastmod: toIsoDate(material.updatedAt),
      changefreq: 'weekly',
      priority: '0.85',
    });

    // Also pre-render clean chapter slug alias (e.g. /materials/class-12-jee/physics/electrostatics)
    if (canonicalPath.startsWith('/materials/')) {
      const cleanChapterSlug = generateCleanSlug(cleanChapter, 'chapter');
      const subjectSlug = resolveSubjectSlug(material.subjectId, subjectName);
      const classSlug = generateCleanSlug(primaryCohortId, 'class');
      const cleanAliasPath = `/materials/${classSlug}/${subjectSlug}/${cleanChapterSlug}`;
      if (!seenOutputPaths.has(cleanAliasPath)) {
        seenOutputPaths.add(cleanAliasPath);
        pages.push({
          outputPath: cleanAliasPath,
          canonicalPath,
          title,
          description,
          jsonLd,
          bodyHtml,
        });
      }
    }
  }

  // 3. Published CBT Mocks & DPPs
  for (const test of STARTER_TESTS) {
    if (test.isPublished === false || test.status !== 'published') continue;
    const isDpp = test.destination === 'dpp';
    const cohortLabel = getCohortLabel(test.cohortId);
    const canonicalPath = getHierarchicalMockTestPath(test);
    const title = buildTestSeoTitle(test.title, isDpp);
    const description = buildTestSeoDescription({
      title: test.title,
      isDpp,
      cohortLabel,
      totalQuestions: test.totalQuestions,
      durationMinutes: test.durationMinutes,
      customDescription: test.seoDescription,
    });
    const summary = buildMockTestSeoSummary({
      title: test.title,
      examCategory: test.examType ?? test.examCategory,
      cohortLabel,
      durationMinutes: test.durationMinutes,
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalMarks,
      positiveMarks: test.positiveMarks,
      negativeMarks: test.negativeMarks,
      negativeMarkingEnabled: test.negativeMarkingEnabled,
    });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Quiz',
          name: test.title,
          description,
          educationalLevel: cohortLabel,
          url: `${CANONICAL_ORIGIN}${canonicalPath}`,
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
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${CANONICAL_ORIGIN}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: isDpp ? 'Chapter-Wise DPPs' : 'CBT Mock Tests',
              item: `${CANONICAL_ORIGIN}${isDpp ? '/dpp' : '/cbt-mocks'}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: test.title,
              item: `${CANONICAL_ORIGIN}${canonicalPath}`,
            },
          ],
        },
      ],
    };

    if (!seenOutputPaths.has(canonicalPath)) {
      seenOutputPaths.add(canonicalPath);
      pages.push({
        outputPath: canonicalPath,
        canonicalPath,
        title,
        description,
        jsonLd,
        bodyHtml: buildShellHtml({
          eyebrow: `${cohortLabel} · ${isDpp ? 'Chapter DPP' : 'NTA CBT Mock Test'}`,
          heading: test.title,
          intro: summary,
          breadcrumbs: [
            { label: 'Home', href: '/' },
            { label: isDpp ? 'Chapter DPPs' : 'CBT Mocks', href: isDpp ? '/dpp' : '/cbt-mocks' },
            { label: test.title },
          ],
        }),
      });
    }

    sitemapEntries.push({
      loc: `${CANONICAL_ORIGIN}${canonicalPath}`,
      lastmod: toIsoDate(test.updatedAt ?? test.createdAtIso),
      changefreq: 'weekly',
      priority: isDpp ? '0.8' : '0.9',
    });
  }

  for (const page of pages) {
    const rendered = injectPageIntoTemplate(baseTemplate, page);
    writePrerenderedFile(page.outputPath, rendered);
  }

  const sitemapXml = buildSitemapXml(sitemapEntries);
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  if (fs.existsSync(PUBLIC_DIR)) {
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  }

  console.log(
    `[prerender-seo] Generated ${pages.length} pre-rendered HTML routes and sitemap.xml (${sitemapEntries.length} URLs).`
  );
}

main();
