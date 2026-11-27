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
import {
  AI_PROVIDER_REGISTRY,
  listConfiguredProviders,
  normalizeMessages,
  resolveCorsHeaders,
  runLiveTeacherLessonWithFallback,
  runPrepsAiWithFallback,
  runStructuredJsonWithFallback,
  runTutorStudioWithFallback,
  sanitizeClientContext,
  sanitizeErrorMessage,
} from './api/_lib/aiGateway';
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

  if (cleanPath === '/arena') {
    return {
      title: 'Prepskm Arena — AI Study Games, Formula Blitz & Elo League | Prepskm',
      description:
        'Play JEE & NEET study games: AI Custom Game Generator, Reaction Chain Duel, Formula Blitz, NCERT Line-Trap, Mistake Boss Fight & Paper Scanner Trainer.',
      canonicalPath: '/arena',
    };
  }

  if (cleanPath === '/mentors') {
    return {
      title: 'Verified IIT & AIIMS 1:1 Mentors, Doubt Forum & Peer Finder | Prepskm',
      description:
        'Book 1:1 mentorship passes with verified IIT & AIIMS toppers, join live audio/video doubt rooms, discuss in the subject forum & match with study peers.',
      canonicalPath: '/mentors',
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
  const raw = sanitizeErrorMessage(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: raw };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message: 'AI provider key was rejected. Please verify your server environment variables.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'AI API quota reached temporarily. Please wait a moment and try again.',
    };
  }
  return {
    status: 500,
    message: raw || 'AI request failed.',
  };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Unified CORS middleware across ALL /api/* routes (prepskm.in, www.prepskm.in, *.vercel.app, localhost & AI Studio preview)
  app.use('/api', (req, res, next) => {
    const corsHeaders = resolveCorsHeaders(
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
      'GET, POST, OPTIONS'
    );
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (key.toLowerCase() === 'content-type') continue;
      res.setHeader(key, value);
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    const configuredProviders = listConfiguredProviders(process.env);
    res.json({
      ok: true,
      service: 'prepskm-api',
      aiConfigured: configuredProviders.length > 0,
      providersReady: configuredProviders.length,
      configuredProviders,
      supportedProviders: AI_PROVIDER_REGISTRY.length,
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

  // 1. Dynamic AI IQ, Priority ("Kya Jaruri Hai / Kya Nahi") & Strategy Mentor (Auto Multi-Provider Failover)
  app.post('/api/gemini/mentor', async (req, res) => {
    try {
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
        '',
        'Return ONLY valid JSON matching this exact structure (no markdown):',
        '{"headline":"string","iqDiagnosis":"string","mustDoPriorities":["string"],"avoidOrSkip":["string"],"sevenDayPlan":[{"day":"Day 1","focus":"string"}],"directAnswer":"string"}',
      ].join('\n');

      const result = await runStructuredJsonWithFallback({
        systemPrompt:
          'You are Preps AI, a friendly Indian JEE Main, JEE Advanced, NEET UG & CBSE Board bhaiya/mentor at PREPSKM.IN. ' +
          'Speak warmly, practically, and encouragingly in natural Hinglish. Strictly ground all advice in the student exact subjects, weak chapters, and question. Never use raw markdown symbols (#, **, *, _, backticks). Output ONLY valid JSON.',
        userPrompt: prompt,
        env: process.env,
        maxTokens: 1800,
        validator: (parsed) => typeof parsed.headline === 'string' && Array.isArray(parsed.mustDoPriorities),
      });

      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        });
        return;
      }

      res.json({ ok: true, mentor: result.data, provider: result.provider });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 2. Dynamic AI PDF / Image / Text Question Paper Extractor for Admin Builder
  app.post('/api/gemini/extract-pdf', async (req, res) => {
    try {
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

      // Text-only extraction runs through the full 5-provider automatic failover chain
      if (!fileBase64) {
        const textResult = await runStructuredJsonWithFallback({
          systemPrompt:
            'You are an expert Indian JEE/NEET exam digitizer. Extract clean, accurate questions, options, verified answer keys, and concise step-by-step solutions in strict JSON.',
          userPrompt: `${instruction}\n\nSOURCE TEXT:\n${String(rawTextInput).slice(0, 30000)}\n\nReturn ONLY valid JSON: {"questions":[{"questionNumber":1,"subjectName":"string","chapterName":"string","questionType":"single-mcq","questionText":"string","optionTexts":["A","B","C","D"],"correctOptionIndices":[0],"numericalAnswer":"","solutionText":"string"}]}`,
          env: process.env,
          maxTokens: 3200,
          validator: (parsed) => Array.isArray(parsed.questions),
        });

        if (!textResult.ok) {
          res.status(503).json({
            ok: false,
            error: textResult.error,
            attemptedProviders: textResult.attemptedProviders,
            providerErrors: textResult.providerErrors,
          });
          return;
        }
        res.json({
          ok: true,
          questions: Array.isArray(textResult.data.questions) ? textResult.data.questions : [],
          provider: textResult.provider,
        });
        return;
      }

      const ai = getGeminiClient();
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        {
          inlineData: {
            mimeType: String(mimeType),
            data: String(fileBase64),
          },
        },
        {
          text: rawTextInput ? `${instruction}\n\nSOURCE TEXT:\n${String(rawTextInput).slice(0, 30000)}` : instruction,
        },
      ];

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
      res.json({ ok: true, questions: Array.isArray(parsed.questions) ? parsed.questions : [], provider: 'gemini' });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 3. Dynamic AI Step-by-Step Solution & Shortcut Explainer (Auto Multi-Provider Failover + Strict Topic Lock)
  app.post('/api/gemini/explain-question', async (req, res) => {
    try {
      const {
        subjectName = '',
        chapterName = '',
        questionText = '',
        optionTexts = [],
        correctAnswer = '',
        studentAnswer = '',
        solutionText = '',
      } = req.body ?? {};

      const cleanQuestion = String(questionText ?? '').trim();
      if (!cleanQuestion) {
        res.status(400).json({ ok: false, error: 'questionText is required to generate an explanation.' });
        return;
      }

      const cleanSubject = String(subjectName ?? '').trim();
      const cleanChapter = String(chapterName ?? '').trim();

      const prompt = [
        cleanSubject || cleanChapter
          ? `STRICT SUBJECT & CHAPTER LOCK: Subject = ${cleanSubject || 'Match question'} | Chapter = ${cleanChapter || 'Match question'}`
          : '',
        `Question: ${cleanQuestion}`,
        Array.isArray(optionTexts) && optionTexts.length > 0
          ? `Options: ${optionTexts.map((o: string, i: number) => `${['A', 'B', 'C', 'D'][i] ?? i + 1}) ${o}`).join(' | ')}`
          : '',
        `Official Correct Answer: ${correctAnswer}`,
        `Student's Answer: ${studentAnswer || 'Skipped'}`,
        solutionText ? `Existing Solution Note: ${solutionText}` : '',
        '',
        'Return ONLY valid JSON (no markdown): {"coreConcept":"string","stepByStep":["step 1","step 2","step 3"],"examShortcut":"string"}',
      ]
        .filter(Boolean)
        .join('\n');

      const result = await runStructuredJsonWithFallback({
        systemPrompt:
          'You are Preps AI, a friendly Indian JEE/NEET bhaiya and mentor at PREPSKM.IN. ' +
          'Stay 100% locked to the exact Subject, Chapter, and Question provided. Explain in simple Hinglish (zero raw markdown like **, #, _, backticks) in 3 compact JSON fields: coreConcept, stepByStep array, and examShortcut. Output ONLY valid JSON.',
        userPrompt: prompt,
        env: process.env,
        maxTokens: 1400,
        validator: (parsed) => typeof parsed.coreConcept === 'string' && Array.isArray(parsed.stepByStep),
      });

      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        });
        return;
      }

      res.json({ ok: true, explanation: result.data, provider: result.provider });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 4. Preps AI Multi-Provider Fallback Endpoint (mirrors Vercel /api/preps-ai, /api/chat & /api/gemini/chat)
  app.post(['/api/preps-ai', '/api/chat', '/api/gemini/chat'], async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const normalizedMessages = normalizeMessages(body);

      if (normalizedMessages.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Please ask a question or say something to Preps AI.',
        });
        return;
      }

      const context = sanitizeClientContext(body.context ?? body.studentContext ?? {});
      if (body.voiceMode) {
        context.voiceMode = true;
      }

      const result = await runPrepsAiWithFallback({
        messages: normalizedMessages,
        context,
        env: process.env,
      });

      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        reply: result.reply,
        provider: result.provider,
        suggestedFollowUps: result.suggestedFollowUps ?? [],
      });
    } catch (err) {
      res.status(503).json({
        ok: false,
        error: sanitizeErrorMessage(err) || 'Preps AI encountered an unexpected server error.',
      });
    }
  });

  // 5. Instant AI Performance Report for a Specific CBT / DPP Test Attempt (Auto Multi-Provider Failover)
  app.post('/api/gemini/test-report', async (req, res) => {
    try {
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
        'Generate a sharp post-test executive report covering score verdict, biggest mark-leak source (negative marks / silly mistakes / overtime), top 3 immediate fixes before next mock, and a realistic target score jump.',
        'Return ONLY valid JSON: {"verdict":"string","markLeakAnalysis":"string","strengths":["string"],"immediateFixes":["string"],"nextMockTarget":"string"}',
      ].join('\n');

      const result = await runStructuredJsonWithFallback({
        systemPrompt:
          'You are a top JEE/NEET exam analyst at PREPSKM.IN. Produce a concise, numbers-first post-test AI Report strictly grounded in the provided subjects and metrics in valid JSON.',
        userPrompt: prompt,
        env: process.env,
        maxTokens: 1500,
        validator: (parsed) => typeof parsed.verdict === 'string' && Array.isArray(parsed.immediateFixes),
      });

      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        });
        return;
      }

      res.json({ ok: true, report: result.data, provider: result.provider });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 6. Expert AI Tutor & Mentor Studio (Automatic Multi-Provider Failover + Strict Subject/Chapter Lock)
  app.post('/api/ai/tutor-studio', async (req, res) => {
    const body = (req.body ?? {}) as { action?: string; payload?: Record<string, unknown> };
    const action = String(body.action ?? '').trim();
    if (!['analyze-sheet', 'learning-path', 'practice-questions'].includes(action)) {
      res.status(400).json({ ok: false, error: 'Invalid tutor studio action.' });
      return;
    }

    try {
      const result = await runTutorStudioWithFallback({
        action,
        payload: body.payload ?? {},
        env: process.env,
      });
      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        });
        return;
      }
      res.status(200).json({ ok: true, result: result.data, provider: result.provider });
    } catch (err) {
      const message = sanitizeErrorMessage(err);
      const isValidation = /required|unsupported/i.test(message);
      res.status(isValidation ? 400 : 502).json({
        ok: false,
        error: message || 'The AI Tutor could not complete this request right now. Please try again shortly.',
      });
    }
  });

  // 7. Prepskm Arena — Dynamic AI Custom Study Game Generator (Auto Multi-Provider Failover + Strict Subject/Chapter Lock)
  app.post('/api/ai/generate-game', async (req, res) => {
    try {
      const body = (req.body ?? {}) as {
        exam?: string;
        subject?: string;
        chapter?: string;
        format?: string;
        difficulty?: string;
        questionCount?: number;
      };

      const exam = String(body.exam ?? 'JEE Main').trim().slice(0, 40);
      const subject = String(body.subject ?? '').trim().slice(0, 40);
      const chapter = String(body.chapter ?? '').trim().slice(0, 120);
      if (!subject || !chapter) {
        res.status(400).json({
          ok: false,
          error: 'Both subject and chapter are required to generate a custom AI game.',
        });
        return;
      }

      const format = String(body.format ?? 'Formula Blitz').trim().slice(0, 60);
      const difficulty = String(body.difficulty ?? 'Exam-Level').trim().slice(0, 40);
      const count = Math.min(8, Math.max(3, Number(body.questionCount) || 5));

      const prompt = [
        `Create a playable ${count}-question interactive study game for Indian ${exam} aspirants.`,
        `STRICT SUBJECT & CHAPTER LOCK: Subject = "${subject}" | Chapter = "${chapter}" | Format = "${format}" | Difficulty = "${difficulty}".`,
        'Requirements:',
        `- Every single question MUST strictly belong to "${chapter}" under ${subject} (${exam} syllabus). Do NOT drift to unrelated chapters.`,
        '- Provide exactly 4 distinct options per question and accurate 0-based correctIndex (0..3).',
        '- Set timeLimitSeconds between 20 and 60 depending on question complexity.',
        '- Include a concise 1-sentence hint and a crisp explanation with the exact formula or NCERT rule.',
        '- Output strictly valid JSON (no markdown):',
        `{"title":"${chapter} ${format}","exam":"${exam}","subject":"${subject}","chapter":"${chapter}","format":"${format}","difficulty":"${difficulty}","xpReward":${count * 30},"questions":[{"id":"q1","prompt":"string","options":["A","B","C","D"],"correctIndex":0,"timeLimitSeconds":25,"hint":"string","explanation":"string"}]}`,
      ].join('\n');

      const result = await runStructuredJsonWithFallback({
        systemPrompt:
          'You are the Prepskm Arena Game Designer for JEE Main, JEE Advanced, NEET UG, and Class 9-12 Boards. ' +
          `Stay 100% locked to Subject "${subject}" and Chapter "${chapter}". Output ONLY valid JSON with verified answers.`,
        userPrompt: prompt,
        env: process.env,
        maxTokens: 2800,
        validator: (parsed) => Array.isArray(parsed.questions) && parsed.questions.length > 0,
      });

      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        provider: result.provider,
        game: {
          ...result.data,
          exam,
          subject,
          chapter,
          format,
          difficulty,
        },
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ ok: false, error: message });
    }
  });

  // 8. Dynamic Live AI Teacher Whiteboard Lesson Endpoint (mirrors Vercel /api/ai/live-lesson)
  app.post('/api/ai/live-lesson', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const questionText = String(body.questionText ?? '').trim();
      if (!questionText) {
        res.status(400).json({
          ok: false,
          error: 'Please enter a question or concept to start the Live AI Tutor.',
        });
        return;
      }

      const result = await runLiveTeacherLessonWithFallback({
        questionText,
        subjectName: typeof body.subjectName === 'string' ? body.subjectName : undefined,
        chapterName: typeof body.chapterName === 'string' ? body.chapterName : undefined,
        solutionText: typeof body.solutionText === 'string' ? body.solutionText : undefined,
        officialAnswer: typeof body.officialAnswer === 'string' ? body.officialAnswer : undefined,
        studentAnswer: typeof body.studentAnswer === 'string' ? body.studentAnswer : undefined,
        env: process.env,
      });

      if (!result.ok) {
        res.status(503).json({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        lesson: result.lesson,
        provider: result.provider,
      });
    } catch (err) {
      res.status(503).json({
        ok: false,
        error: sanitizeErrorMessage(err) || 'Live AI Tutor could not generate this lesson right now.',
      });
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
        if (prerenderedPath.startsWith(distDir + path.sep) && fs.existsSync(prerenderedPath)) {
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
