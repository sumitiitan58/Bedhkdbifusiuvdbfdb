import 'dotenv/config';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CANONICAL_ORIGIN,
  buildMaterialSeoSummary,
  buildMockTestSeoSummary,
  buildSitemapXml,
  generateCleanSlug,
  getHierarchicalMaterialPath,
  getHierarchicalMockTestPath,
  getMaterialSlug,
  getMockTestSlug,
  resolveSubjectSlug,
  stripChapterNumberPrefix,
  type SitemapUrlEntry,
} from './src/utils/seoHelpers';
import {
  ABOUT_FAQS,
  buildChapterFaqs,
  buildChapterSeoDescription,
  buildChapterSeoTitle,
  buildFaqPageJsonLd,
  buildTestSeoDescription,
  buildTestSeoTitle,
} from './src/data/seoContent';
import { countConfiguredProviders, runPrepsAiWithFallback } from './functions/api/preps-ai.js';
import {
  JEE_CONCISE_CHAPTERS,
  JEE_CONCISE_MATERIALS,
} from './src/data/jeeConciseNotesCatalog';
import {
  PCMB_FORMULA_CHAPTERS,
  PCMB_FORMULA_MATERIALS,
} from './src/data/pcmbFormulaSheetsCatalog';
import {
  STARTER_CHAPTERS,
  STARTER_MATERIALS,
  STARTER_SUBJECTS,
  STARTER_TESTS,
} from './src/services/starterCatalog';
import { flattenClassGroupsToCohorts, STARTER_CLASS_GROUPS } from './src/services/platformRegistry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_MODEL = 'gemini-4-hydrogen';

const ALL_STATIC_COHORTS = flattenClassGroupsToCohorts(STARTER_CLASS_GROUPS);
const ALL_STATIC_MATERIALS = [
  ...PCMB_FORMULA_MATERIALS,
  ...JEE_CONCISE_MATERIALS,
  ...STARTER_MATERIALS,
];
const ALL_STATIC_CHAPTERS = [
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
  return ALL_STATIC_COHORTS.find((c) => c.id === cohortId)?.label ?? cohortId;
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

interface RouteSeoSnapshot {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
  jsonLd?: Record<string, unknown>;
  bodyHtml?: string;
}

function resolveRouteSeo(reqPath: string): RouteSeoSnapshot | null {
  const cleanPath = reqPath.split('?')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === '/materials') {
    return {
      title: 'Study Materials, Notes & Inline DPPs | Prepskm',
      description:
        'Download free chapter-wise JEE, NEET & Board concise notes, formula sheets, and PYQs — plus launch timed Chapter DPPs directly inline on Prepskm.',
      canonicalPath: '/materials',
    };
  }

  if (cleanPath === '/cbt-mocks' || cleanPath === '/tests') {
    return {
      title: 'Free NTA CBT Mock Tests for JEE & NEET | Prepskm',
      description:
        'Attempt free NTA-pattern JEE Main, JEE Advanced, NEET UG & Board CBT mock tests with +4/-1 marking, live timer, and Prep Score (0–100) analysis.',
      canonicalPath: '/cbt-mocks',
    };
  }

  if (cleanPath === '/dpp') {
    return {
      title: 'Chapter-Wise Daily Practice Problems (DPP) | Prepskm',
      description:
        'Solve timed JEE Main, JEE Advanced & NEET chapter-wise Daily Practice Problems (DPPs) with +4/-1 evaluation, instant scoring, and step-by-step solutions.',
      canonicalPath: '/dpp',
    };
  }

  if (cleanPath === '/analytics' || cleanPath === '/analysis') {
    return {
      title: 'Prep Score (0–100) & Test Analysis | Prepskm',
      description:
        'Track your calibrated Prep Score (0–100), predicted percentile, pacing breakdown, and export 3-tab analytics to Google Sheets & Google Tasks.',
      canonicalPath: '/analytics',
    };
  }

  if (cleanPath === '/mistakes' || cleanPath === '/mistake-notebook') {
    return {
      title: 'AI Mistake Notebook & Re-Attempt Sets | Prepskm',
      description:
        'Diagnose error patterns (rushed slips, time-sinks, conceptual gaps) and launch personalized timed re-attempt drills with Preps AI step-by-step fixes.',
      canonicalPath: '/mistakes',
    };
  }

  if (cleanPath === '/preps-ai') {
    return {
      title: 'Preps AI — Live-Context JEE & NEET Mentor | Prepskm',
      description:
        'Compact voice & chat AI mentor synced with your live Prep Score (0–100), streak, and Mistake Notebook for instant JEE, NEET & Board solutions.',
      canonicalPath: '/preps-ai',
    };
  }

  if (cleanPath === '/lectures') {
    return {
      title: 'JEE, NEET & Board Concept Video Lectures | Prepskm',
      description:
        'Watch chapter-wise concept revision video lectures for Class 9–12 Boards, JEE Main, JEE Advanced, and NEET UG paired with concise notes and DPPs.',
      canonicalPath: '/lectures',
    };
  }

  if (cleanPath === '/about') {
    const aboutFaqJsonLd = {
      '@context': 'https://schema.org',
      ...buildFaqPageJsonLd(ABOUT_FAQS),
    };
    return {
      title: 'About Prepskm (@unfiltereddsumit) — JEE & NEET Prep',
      description:
        'Discover how PREPSKM.IN by @unfiltereddsumit unites chapter notes, inline DPPs, NTA CBT mocks, Prep Score (0–100), AI Mistake Lab & Google Workspace.',
      canonicalPath: '/about',
      jsonLd: aboutFaqJsonLd,
    };
  }

  // Match /materials/:classSlug/:subjectSlug/:chapterSlug, /materials/:slug, /pyqs/:slug
  const hierarchicalMatMatch = cleanPath.match(/^\/materials\/([^/]+)\/([^/]+)\/([^/]+)$/);
  const flatMatMatch = cleanPath.match(/^\/(?:materials|pyqs)\/([^/]+)$/);
  const matSlug = (hierarchicalMatMatch?.[3] ?? flatMatMatch?.[1] ?? '').toLowerCase();

  if (matSlug) {
    let material = ALL_STATIC_MATERIALS.find(
      (m) =>
        getMaterialSlug(m) === matSlug ||
        m.id.toLowerCase() === matSlug ||
        (m.seoSlug && m.seoSlug.toLowerCase() === matSlug)
    );

    if (!material && hierarchicalMatMatch) {
      const requestedClass = hierarchicalMatMatch[1].toLowerCase();
      const requestedSubject = hierarchicalMatMatch[2].toLowerCase();
      material = ALL_STATIC_MATERIALS.find((m) => {
        const subjectSlug = resolveSubjectSlug(m.subjectId, getSubjectName(m.subjectId));
        if (subjectSlug !== requestedSubject) return false;
        const chapter = ALL_STATIC_CHAPTERS.find((c) => c.id === m.chapterId);
        const chapterCleanSlug = generateCleanSlug(
          stripChapterNumberPrefix(chapter?.name ?? m.title),
          'chapter'
        );
        if (chapterCleanSlug !== matSlug) return false;
        return m.cohorts.includes(requestedClass) || m.cohorts.length === 0;
      });
    }

    if (material) {
      const subjectName = getSubjectName(material.subjectId);
      const chapter = ALL_STATIC_CHAPTERS.find((c) => c.id === material.chapterId);
      const cleanChapter = stripChapterNumberPrefix(chapter?.name ?? material.title);
      const requestedClass = hierarchicalMatMatch?.[1];
      const primaryCohortId =
        requestedClass && material.cohorts.includes(requestedClass)
          ? requestedClass
          : material.cohorts[0] ?? 'class-11-jee';
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

      const bodyHtml = `
      <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:960px;margin:0 auto;padding:24px 16px;color:#0B1B3B;">
        <nav aria-label="Breadcrumb" style="font-size:13px;margin-bottom:12px;">
          <a href="/">Home</a> &rsaquo; <a href="/materials">Study Materials</a> &rsaquo; <a href="/materials?track=${encodeURIComponent(primaryCohortId)}">${escapeHtml(primaryCohortLabel)}</a> &rsaquo; <span>${escapeHtml(cleanChapter)}</span>
        </nav>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 12px;">${escapeHtml(cleanChapter)} ${escapeHtml(resourceLabel)} PDF — ${escapeHtml(primaryCohortLabel)} ${escapeHtml(subjectName)}</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(summary)}</p>
        <h2 style="font-size:20px;font-weight:700;margin:20px 0 8px;">Topic Overview &amp; Revision Guide</h2>
        <p style="font-size:14px;color:#475569;">${escapeHtml(material.description || description)}</p>
        <p style="margin-top:16px;"><a href="${escapeHtml(material.fileUrl)}">Download ${escapeHtml(material.fileName || material.title)} PDF</a></p>
      </div>`;

      return {
        title,
        description,
        canonicalPath,
        keywords: material.seoKeywords,
        jsonLd,
        bodyHtml,
      };
    }
  }

  // Match /cbt-mocks/:examSlug/:testSlug, /cbt-mocks/:slug, /dpp/:classSlug/:chapterSlug
  const testMatch =
    cleanPath.match(/^\/cbt-mocks\/[^/]+\/([^/]+)$/) ||
    cleanPath.match(/^\/cbt-mocks\/([^/]+)$/) ||
    cleanPath.match(/^\/dpp\/[^/]+\/([^/]+)$/);
  const testSlug = (testMatch?.[1] ?? '').toLowerCase();

  if (testSlug) {
    const test = STARTER_TESTS.find(
      (t) =>
        t.status === 'published' &&
        (getMockTestSlug(t) === testSlug || t.id.toLowerCase() === testSlug)
    );
    if (test) {
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

      const bodyHtml = `
      <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:960px;margin:0 auto;padding:24px 16px;color:#0B1B3B;">
        <nav aria-label="Breadcrumb" style="font-size:13px;margin-bottom:12px;">
          <a href="/">Home</a> &rsaquo; <a href="${isDpp ? '/dpp' : '/cbt-mocks'}">${isDpp ? 'Chapter-Wise DPPs' : 'CBT Mock Tests'}</a> &rsaquo; <span>${escapeHtml(test.title)}</span>
        </nav>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 12px;">${escapeHtml(test.title)}</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(summary)}</p>
      </div>`;

      return { title, description, canonicalPath, jsonLd, bodyHtml };
    }
  }

  return null;
}

function injectRouteSeoIntoHtml(html: string, seo: RouteSeoSnapshot): string {
  const safeTitle = escapeHtml(seo.title);
  const safeDesc = escapeHtml(seo.description);
  const canonicalUrl = `${CANONICAL_ORIGIN}${seo.canonicalPath}`;

  let out = html
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

  if (seo.jsonLd) {
    const ldScript = `<script id="prepskm-ssr-ld" type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>\n  </head>`;
    out = out.replace(/<\/head>/i, ldScript);
  }

  if (seo.bodyHtml) {
    out = out.replace(
      /<div id="root">[\s\S]*?<\/div>\s*<script type="module"/i,
      `<div id="root">${seo.bodyHtml}</div>\n    <script type="module"`
    );
  }

  return out;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets to enable AI features.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: raw };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key was rejected. Please verify your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API quota reached temporarily. Please wait a moment and try again.',
    };
  }
  return {
    status: 500,
    message: raw || 'Gemini AI request failed.',
  };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    const providersReady = countConfiguredProviders(process.env);
    res.json({
      ok: true,
      service: 'prepskm-api',
      aiConfigured: providersReady > 0,
      providersReady,
    });
  });

  // Dynamic XML Sitemap (static pages + 82 JEE Concise Notes + starter catalog + live Firestore published docs)
  app.get('/sitemap.xml', async (_req, res) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const toIsoDate = (val: unknown): string =>
      typeof val === 'string' && val.length >= 10 ? val.slice(0, 10) : todayIso;

    const entries: SitemapUrlEntry[] = [
      { loc: `${CANONICAL_ORIGIN}/`, lastmod: todayIso, changefreq: 'daily', priority: '1.0' },
      { loc: `${CANONICAL_ORIGIN}/cbt-mocks`, lastmod: todayIso, changefreq: 'daily', priority: '0.95' },
      { loc: `${CANONICAL_ORIGIN}/materials`, lastmod: todayIso, changefreq: 'daily', priority: '0.95' },
      { loc: `${CANONICAL_ORIGIN}/dpp`, lastmod: todayIso, changefreq: 'daily', priority: '0.9' },
      { loc: `${CANONICAL_ORIGIN}/analytics`, lastmod: todayIso, changefreq: 'weekly', priority: '0.75' },
      { loc: `${CANONICAL_ORIGIN}/preps-ai`, lastmod: todayIso, changefreq: 'weekly', priority: '0.8' },
      { loc: `${CANONICAL_ORIGIN}/lectures`, lastmod: todayIso, changefreq: 'weekly', priority: '0.75' },
      { loc: `${CANONICAL_ORIGIN}/about`, lastmod: todayIso, changefreq: 'monthly', priority: '0.7' },
    ];

    // 1. Official 82 JEE Concise Notes + Starter Materials (hierarchical URLs)
    for (const mat of ALL_STATIC_MATERIALS) {
      if (mat.isPublished === false) continue;
      const routePath = getHierarchicalMaterialPath(mat, {
        subjectName: getSubjectName(mat.subjectId),
        cohortId: mat.cohorts[0],
      });
      entries.push({
        loc: `${CANONICAL_ORIGIN}${routePath}`,
        lastmod: toIsoDate(mat.updatedAt),
        changefreq: 'weekly',
        priority: '0.85',
      });
    }

    // 2. Starter CBT Mocks & DPPs (hierarchical URLs)
    for (const test of STARTER_TESTS) {
      if (test.isPublished === false || test.status !== 'published') continue;
      const routePath = getHierarchicalMockTestPath(test);
      entries.push({
        loc: `${CANONICAL_ORIGIN}${routePath}`,
        lastmod: toIsoDate(test.updatedAt ?? test.createdAtIso),
        changefreq: 'weekly',
        priority: test.destination === 'dpp' ? '0.8' : '0.9',
      });
    }

    // 3. Dynamically query published materials & CBT mocks/DPPs from Firestore REST API (non-blocking fallback)
    try {
      const fbConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
      if (fs.existsSync(fbConfigPath)) {
        const fbConfig = JSON.parse(fs.readFileSync(fbConfigPath, 'utf-8')) as {
          projectId?: string;
          firestoreDatabaseId?: string;
        };
        if (fbConfig.projectId) {
          const dbId = fbConfig.firestoreDatabaseId || '(default)';
          const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
            fbConfig.projectId
          )}/databases/${encodeURIComponent(dbId)}/documents`;

          interface FsField {
            stringValue?: string;
            booleanValue?: boolean;
            arrayValue?: { values?: Array<{ stringValue?: string }> };
          }

          const fetchCollection = async (col: string) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2500);
            try {
              const resp = await fetch(`${base}/${col}?pageSize=300`, { signal: controller.signal });
              if (!resp.ok) return [];
              const data = (await resp.json()) as {
                documents?: Array<{
                  name?: string;
                  updateTime?: string;
                  fields?: Record<string, FsField>;
                }>;
              };
              return data.documents ?? [];
            } catch {
              return [];
            } finally {
              clearTimeout(timer);
            }
          };

          const [fsMaterials, fsTests] = await Promise.all([
            fetchCollection('materials'),
            fetchCollection('mockTests'),
          ]);

          for (const doc of fsMaterials) {
            const f = doc.fields ?? {};
            if (f.isPublished?.booleanValue === false) continue;
            const id = doc.name?.split('/').pop() ?? '';
            const title = f.title?.stringValue ?? '';
            if (!id && !title) continue;
            const cohorts =
              f.cohorts?.arrayValue?.values
                ?.map((v) => v.stringValue)
                .filter((s): s is string => Boolean(s)) ?? [];
            const subjectId = f.subjectId?.stringValue ?? '';
            const routePath = getHierarchicalMaterialPath(
              {
                id,
                title,
                slug: f.slug?.stringValue,
                seoSlug: f.seoSlug?.stringValue,
                sectionName: f.sectionName?.stringValue ?? '',
                resourceType: (f.resourceType?.stringValue ?? 'PDF') as never,
                subjectId,
                cohorts,
              },
              {
                subjectName: getSubjectName(subjectId),
                cohortId: cohorts[0],
              }
            );
            const lastmod = toIsoDate(f.updatedAt?.stringValue || doc.updateTime);
            entries.push({
              loc: `${CANONICAL_ORIGIN}${routePath}`,
              lastmod,
              changefreq: 'weekly',
              priority: '0.85',
            });
          }

          for (const doc of fsTests) {
            const f = doc.fields ?? {};
            if (f.isPublished?.booleanValue === false) continue;
            if (f.status?.stringValue && f.status.stringValue !== 'published') continue;
            const id = doc.name?.split('/').pop() ?? '';
            const title = f.title?.stringValue ?? '';
            if (!id && !title) continue;
            const dest = f.destination?.stringValue === 'dpp' ? 'dpp' : 'cbt-mock';
            const routePath = getHierarchicalMockTestPath({
              id,
              title,
              slug: f.slug?.stringValue,
              cohortId: f.cohortId?.stringValue ?? 'class-12-jee',
              examCategory: f.examCategory?.stringValue ?? 'JEE Main',
              destination: dest,
            });
            const lastmod = toIsoDate(f.updatedAt?.stringValue || doc.updateTime);
            entries.push({
              loc: `${CANONICAL_ORIGIN}${routePath}`,
              lastmod,
              changefreq: 'weekly',
              priority: dest === 'dpp' ? '0.8' : '0.9',
            });
          }
        }
      }
    } catch {
      // Fall back gracefully to catalog sitemap entries
    }

    const xml = buildSitemapXml(entries);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(xml);
  });

  // 1. Gemini AI IQ, Priority ("Kya Jaruri Hai / Kya Nahi") & Strategy Mentor
  app.post('/api/gemini/mentor', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const {
        studentName = 'Student',
        cohortLabel = 'Class 12 JEE',
        attemptsCount = 0,
        averageAccuracy = 0,
        averageIqScore = 0,
        latestIqScore = 0,
        paceSummary = { tooFast: 0, optimal: 0, tooSlow: 0, unattempted: 0 },
        subjectPerformance = [],
        weakChapters = [],
        weeklyCompletionPercent = 0,
        userQuestion = '',
      } = req.body ?? {};

      const prompt = [
        `Student: ${studentName} | Track: ${cohortLabel}`,
        `Tests Taken: ${attemptsCount} | Overall Accuracy: ${averageAccuracy}% | Latest IQ Score: ${latestIqScore}/150 (Avg IQ: ${averageIqScore}/150)`,
        `Pacing Totals -> Too Fast (rushing): ${paceSummary.tooFast ?? 0}, Optimal Pace: ${paceSummary.optimal ?? 0}, Too Slow: ${paceSummary.tooSlow ?? 0}, Skipped: ${paceSummary.unattempted ?? 0}`,
        `Weekly Schedule Completion: ${weeklyCompletionPercent}%`,
        `Subject Breakdown: ${JSON.stringify(subjectPerformance)}`,
        `Weakest Chapters: ${JSON.stringify(weakChapters)}`,
        userQuestion
          ? `Student's Direct Question: "${String(userQuestion).slice(0, 600)}"`
          : 'Student wants a clear high-ROI diagnosis of their Exam IQ, what is strictly essential ("Kya Jaruri Hai"), what to avoid/skip ("Kya Jaruri Nahi Hai"), and a crisp 7-day execution plan.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the senior JEE Main, JEE Advanced, NEET UG & CBSE Board Academic Strategist at PREPSKM.IN. ' +
            'Speak directly, practically, and encouragingly in crisp English (with light natural Hinglish headers like "Kya Jaruri Hai" where helpful). ' +
            'Give concrete, honest, high-ROI advice tailored to the student track and real stats. Avoid fluff. Keep every bullet short and actionable.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'A sharp 1-sentence strategic verdict for this student.',
              },
              iqDiagnosis: {
                type: Type.STRING,
                description:
                  '2-3 sentences explaining the student IQ Score, pacing balance (rushing vs slow), and how to boost exam IQ.',
              },
              mustDoPriorities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  '4-5 specific high-yield topics, habits, or revision actions that are strictly necessary right now (Kya Jaruri Hai).',
              },
              avoidOrSkip: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  '3-4 low-ROI traps, distractions, or time-wasters the student must stop doing right now (Kya Jaruri Nahi Hai).',
              },
              sevenDayPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    focus: { type: Type.STRING },
                  },
                  required: ['day', 'focus'],
                },
                description: 'Compact 4-to-7 step action sprint for the upcoming week.',
              },
              directAnswer: {
                type: Type.STRING,
                description:
                  'Direct, helpful answer to the student specific question if one was asked; otherwise a closing motivational tip.',
              },
            },
            required: [
              'headline',
              'iqDiagnosis',
              'mustDoPriorities',
              'avoidOrSkip',
              'sevenDayPlan',
              'directAnswer',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({ ok: true, mentor: parsed });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 2. Gemini AI PDF / Image Question Paper Extractor for Admin Builder
  app.post('/api/gemini/extract-pdf', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const {
        fileBase64,
        mimeType = 'application/pdf',
        rawTextInput = '',
        defaultSubject = 'Physics',
        examType = 'JEE Main',
        maxQuestions = 20,
      } = req.body ?? {};

      if (!fileBase64 && !String(rawTextInput).trim()) {
        res.status(400).json({
          ok: false,
          error: 'Upload a PDF/image file or paste question text to extract questions.',
        });
        return;
      }

      const instruction = [
        `Extract up to ${Math.min(40, Math.max(1, Number(maxQuestions) || 20))} exam questions from the attached ${examType} document/text.`,
        `Default subject if not specified in the paper: ${defaultSubject}.`,
        'Rules:',
        '- Identify questionType accurately as "single-mcq", "multi-mcq", or "integer".',
        '- For single-mcq and multi-mcq, extract exactly 4 clean optionTexts (without leading "A.", "B." prefixes if possible) and set correctOptionIndices (0-based indices 0..3). If an answer key is not explicitly shown in the PDF, solve the question carefully and provide the verified correctOptionIndices or numericalAnswer.',
        '- For integer questions, set numericalAnswer as a clean number string (e.g. "5" or "24.5") and leave optionTexts empty.',
        '- Always include a concise, accurate solutionText explaining how to arrive at the answer.',
        '- Detect subjectName (Physics, Chemistry, Mathematics, or Biology) and chapterName for each question.',
      ].join('\n');

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (fileBase64) {
        parts.push({
          inlineData: {
            mimeType: String(mimeType),
            data: String(fileBase64),
          },
        });
      }
      parts.push({
        text: rawTextInput ? `${instruction}\n\nSOURCE TEXT:\n${String(rawTextInput).slice(0, 30000)}` : instruction,
      });

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { parts },
        config: {
          systemInstruction:
            'You are an expert Indian JEE/NEET exam digitizer. Extract clean, accurate questions, options, verified answer keys, and concise step-by-step solutions in strict JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER },
                    subjectName: { type: Type.STRING },
                    chapterName: { type: Type.STRING },
                    questionType: {
                      type: Type.STRING,
                      description: 'Must be single-mcq, multi-mcq, or integer',
                    },
                    questionText: { type: Type.STRING },
                    optionTexts: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctOptionIndices: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                    },
                    numericalAnswer: { type: Type.STRING },
                    solutionText: { type: Type.STRING },
                  },
                  required: ['questionNumber', 'subjectName', 'questionType', 'questionText', 'solutionText'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const jsonText = (response.text ?? '{"questions":[]}').trim();
      const parsed = JSON.parse(jsonText) as { questions?: unknown[] };
      res.json({ ok: true, questions: Array.isArray(parsed.questions) ? parsed.questions : [] });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 3. Gemini AI Step-by-Step Solution & Shortcut Explainer (for Past Test Review)
  app.post('/api/gemini/explain-question', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const {
        subjectName = 'Science',
        chapterName = '',
        questionText = '',
        optionTexts = [],
        correctAnswer = '',
        studentAnswer = '',
        solutionText = '',
      } = req.body ?? {};

      const prompt = [
        `Subject: ${subjectName}${chapterName ? ` | Chapter: ${chapterName}` : ''}`,
        `Question: ${questionText}`,
        Array.isArray(optionTexts) && optionTexts.length > 0
          ? `Options: ${optionTexts.map((o: string, i: number) => `${['A', 'B', 'C', 'D'][i] ?? i + 1}) ${o}`).join(' | ')}`
          : '',
        `Official Correct Answer: ${correctAnswer}`,
        `Student's Answer: ${studentAnswer || 'Skipped'}`,
        solutionText ? `Existing Solution Note: ${solutionText}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a top JEE/NEET faculty mentor at PREPSKM.IN. Explain the question clearly in 3 compact sections: (1) Core Concept & Formula, (2) Step-by-Step Solving, (3) 10-Second Exam Shortcut / Mistake to Avoid. Keep it under 180 words.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coreConcept: { type: Type.STRING },
              stepByStep: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              examShortcut: { type: Type.STRING },
            },
            required: ['coreConcept', 'stepByStep', 'examShortcut'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ ok: true, explanation: parsed });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 4. Preps AI Multi-Provider Fallback Endpoint (mirrors functions/api/preps-ai.js for local & Node runtimes)
  app.options('/api/preps-ai', (req, res) => {
    const origin = req.headers.origin || '';
    if (
      origin === 'https://prepskm.in' ||
      origin === 'https://www.prepskm.in' ||
      /^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/i.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
  });

  app.post(['/api/preps-ai', '/api/gemini/chat'], async (req, res) => {
    const origin = req.headers.origin || '';
    if (
      origin === 'https://prepskm.in' ||
      origin === 'https://www.prepskm.in' ||
      /^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/i.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    try {
      const body = (req.body ?? {}) as {
        messages?: Array<{ role?: string; content?: string; text?: string }>;
        context?: Record<string, unknown>;
        message?: string;
        history?: Array<{ role?: string; text?: string; content?: string }>;
        studentContext?: Record<string, unknown>;
        voiceMode?: boolean;
      };

      const normalizedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (Array.isArray(body.messages) && body.messages.length > 0) {
        for (const item of body.messages.slice(-14)) {
          const role = item?.role === 'assistant' || item?.role === 'model' ? 'assistant' : 'user';
          const content = String(item?.content ?? item?.text ?? '').trim().slice(0, 3000);
          if (content) normalizedMessages.push({ role, content });
        }
      } else {
        if (Array.isArray(body.history)) {
          for (const item of body.history.slice(-13)) {
            const role = item?.role === 'assistant' || item?.role === 'model' ? 'assistant' : 'user';
            const content = String(item?.content ?? item?.text ?? '').trim().slice(0, 3000);
            if (content) normalizedMessages.push({ role, content });
          }
        }
        const single = String(body.message ?? '').trim().slice(0, 3000);
        if (single) {
          normalizedMessages.push({ role: 'user', content: single });
        }
      }

      if (normalizedMessages.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Please ask a question or say something to Preps AI.',
        });
        return;
      }

      const context = {
        ...(body.context ?? body.studentContext ?? {}),
        ...(body.voiceMode ? { voiceMode: true } : {}),
      };

      const result = await runPrepsAiWithFallback({
        messages: normalizedMessages,
        context,
        env: process.env,
      });

      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        reply: result.reply,
        provider: result.provider,
        suggestedFollowUps: result.suggestedFollowUps ?? [],
      });
    } catch {
      res.status(503).json({
        ok: false,
        error: 'Preps AI is temporarily busy. Please try your question again in a moment.',
      });
    }
  });

  // 5. Instant AI Performance Report for a Specific CBT / DPP Test Attempt
  app.post('/api/gemini/test-report', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const {
        testTitle = 'Mock Test',
        cohortLabel = 'JEE Main',
        metrics = {},
        subjectScores = [],
        attemptBuckets = {},
        difficultyBreakdown = [],
      } = req.body ?? {};

      const prompt = [
        `Test: ${testTitle} (${cohortLabel})`,
        `Overall Metrics: ${JSON.stringify(metrics)}`,
        `Subject Breakdown: ${JSON.stringify(subjectScores)}`,
        `Attempt & Time Buckets: ${JSON.stringify(attemptBuckets)}`,
        `Difficulty Breakdown: ${JSON.stringify(difficultyBreakdown)}`,
        'Generate a sharp, Quizrr-style post-test executive report covering score verdict, biggest mark-leak source (negative marks / silly mistakes / overtime), top 3 immediate fixes before next mock, and a realistic target score jump.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a top JEE/NEET exam analyst at PREPSKM.IN. Produce a concise, numbers-first post-test AI Report in strict JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING },
              markLeakAnalysis: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              immediateFixes: { type: Type.ARRAY, items: { type: Type.STRING } },
              nextMockTarget: { type: Type.STRING },
            },
            required: ['verdict', 'markLeakAnalysis', 'strengths', 'immediateFixes', 'nextMockTarget'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ ok: true, report: parsed });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Dev SPA fallback with dynamic per-route SEO meta & semantic HTML injection
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        const seo = resolveRouteSeo(url);
        if (seo) {
          template = injectRouteSeoIntoHtml(template, seo);
        }
        const transformed = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(transformed);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false }));
    const distIndexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    app.get('*', (req, res) => {
      const cleanRoute = req.path.replace(/^\/+|\/+$/g, '');
      if (cleanRoute && !cleanRoute.includes('..')) {
        const prerenderedPath = path.resolve(distDir, cleanRoute, 'index.html');
        if (prerenderedPath.startsWith(distDir) && fs.existsSync(prerenderedPath)) {
          res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).sendFile(prerenderedPath);
          return;
        }
      }
      const seo = resolveRouteSeo(req.originalUrl);
      const html = seo ? injectRouteSeoIntoHtml(distIndexHtml, seo) : distIndexHtml;
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`PREPSKM.IN server listening on http://0.0.0.0:${port}`);
  });
}

void createApp();
