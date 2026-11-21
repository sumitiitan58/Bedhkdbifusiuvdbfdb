import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CANONICAL_ORIGIN,
  buildMaterialSeoSummary,
  buildMockTestSeoSummary,
  buildSitemapXml,
  getHierarchicalMaterialPath,
  getHierarchicalMockTestPath,
  getMaterialSlug,
  getMockTestSlug,
  stripChapterNumberPrefix,
  type SitemapUrlEntry,
} from './src/utils/seoHelpers';
import {
  JEE_CONCISE_CHAPTERS,
  JEE_CONCISE_MATERIALS,
} from './src/data/jeeConciseNotesCatalog';
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
const ALL_STATIC_MATERIALS = [...JEE_CONCISE_MATERIALS, ...STARTER_MATERIALS];
const ALL_STATIC_CHAPTERS = [...JEE_CONCISE_CHAPTERS, ...STARTER_CHAPTERS];

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
      title: 'JEE & NEET Chapter-Wise Study Materials & Concise Notes | PREPSKM.IN',
      description:
        'Download free chapter-wise JEE Main, JEE Advanced, NEET UG & CBSE Board concise notes, formula sheets, and PYQ PDFs on PREPSKM.IN.',
      canonicalPath: '/materials',
    };
  }

  if (cleanPath === '/cbt-mocks') {
    return {
      title: 'NTA CBT Mock Test Engine - Prepskm',
      description:
        'Attempt free NTA-pattern JEE Main, JEE Advanced & NEET CBT mock tests with +4/-1 marking and AI analysis on PREPSKM.IN.',
      canonicalPath: '/cbt-mocks',
    };
  }

  if (cleanPath === '/dpp') {
    return {
      title: 'Daily Practice Problems (DPP) for JEE & NEET - Prepskm',
      description:
        'Solve timed chapter-wise Daily Practice Problems (DPPs) with instant evaluation, +4/-1 marking, and step-by-step solutions on PREPSKM.IN.',
      canonicalPath: '/dpp',
    };
  }

  if (cleanPath === '/analytics') {
    return {
      title: 'AI IQ & Performance Analytics | PREPSKM.IN',
      description:
        'Review past test solutions, Subject Mastery Radar, Exam IQ Score, and pacing insights on PREPSKM.IN.',
      canonicalPath: '/analytics',
    };
  }

  if (cleanPath === '/about') {
    return {
      title: 'About Prepskm (@unfiltereddsumit) | PREPSKM.IN',
      description:
        'Learn about Prepskm, founded by Sumit (@unfiltereddsumit) to deliver free JEE, NEET & Board concise notes, CBT mocks, and DPPs.',
      canonicalPath: '/about',
    };
  }

  // Match /materials/:classSlug/:subjectSlug/:chapterSlug, /materials/:slug, /pyqs/:slug
  const hierarchicalMatMatch = cleanPath.match(/^\/materials\/([^/]+)\/([^/]+)\/([^/]+)$/);
  const flatMatMatch = cleanPath.match(/^\/(?:materials|pyqs)\/([^/]+)$/);
  const matSlug = (hierarchicalMatMatch?.[3] ?? flatMatMatch?.[1] ?? '').toLowerCase();

  if (matSlug) {
    const material = ALL_STATIC_MATERIALS.find(
      (m) =>
        getMaterialSlug(m) === matSlug ||
        m.id.toLowerCase() === matSlug ||
        (m.seoSlug && m.seoSlug.toLowerCase() === matSlug)
    );
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
      const sectionLabel = material.sectionName || 'Concise Notes';
      const canonicalPath = getHierarchicalMaterialPath(material, {
        subjectName,
        cohortId: primaryCohortId,
      });
      const title = `${cleanChapter} ${sectionLabel} & PDF – ${primaryCohortLabel} ${subjectName} | PREPSKM.IN`;
      const description =
        material.seoDescription?.trim() ||
        `Download free ${cleanChapter} concise notes, formula sheets, PYQs, and attempt NTA-grade CBT mocks for ${primaryCohortLabel} on PREPSKM.IN.`;
      const summary = buildMaterialSeoSummary({
        title: material.title,
        subjectName,
        chapterName: cleanChapter,
        sectionName: sectionLabel,
        cohortLabels: material.cohorts.map(getCohortLabel),
        description: material.description,
      });

      const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'LearningResource',
            name: title,
            headline: material.title,
            description,
            educationalLevel: material.cohorts.map(getCohortLabel).join(', ') || primaryCohortLabel,
            learningResourceType: sectionLabel,
            inLanguage: 'en-IN',
            about: { '@type': 'Thing', name: `${subjectName} - ${cleanChapter}` },
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
                name: `${cleanChapter} ${sectionLabel}`,
                item: `${CANONICAL_ORIGIN}${canonicalPath}`,
              },
            ],
          },
        ],
      };

      const bodyHtml = `
      <div style="font-family:'DM Sans',system-ui,sans-serif;max-width:960px;margin:0 auto;padding:24px 16px;color:#0B1B3B;">
        <nav aria-label="Breadcrumb" style="font-size:13px;margin-bottom:12px;">
          <a href="/">Home</a> &rsaquo; <a href="/materials">Materials</a> &rsaquo; <a href="/materials?track=${encodeURIComponent(primaryCohortId)}">${escapeHtml(primaryCohortLabel)}</a> &rsaquo; <span>${escapeHtml(cleanChapter)}</span>
        </nav>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 12px;">${escapeHtml(cleanChapter)} ${escapeHtml(sectionLabel)} &amp; PDF — ${escapeHtml(primaryCohortLabel)} ${escapeHtml(subjectName)}</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(summary)}</p>
        <h2 style="font-size:20px;font-weight:700;margin:20px 0 8px;">Key Concepts &amp; Formula Overview</h2>
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
      const title = isDpp
        ? `${test.title} – ${cohortLabel} Chapter DPP | PREPSKM.IN`
        : `${test.title} – ${cohortLabel} Free NTA CBT Mock Test | PREPSKM.IN`;
      const description =
        test.seoDescription?.trim() ||
        `Attempt ${test.title} free ${isDpp ? 'Chapter DPP' : 'NTA CBT Mock Test'} for ${cohortLabel} on PREPSKM.IN — ${test.totalQuestions} questions, ${test.durationMinutes} min & instant solutions.`;
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
    res.json({ ok: true, service: 'prepskm-api', aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
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
      { loc: `${CANONICAL_ORIGIN}/about`, lastmod: todayIso, changefreq: 'monthly', priority: '0.6' },
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

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
      const seo = resolveRouteSeo(req.originalUrl);
      const html = seo ? injectRouteSeoIntoHtml(distIndexHtml, seo) : distIndexHtml;
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`PREPSKM.IN server listening on http://0.0.0.0:${port}`);
  });
}

void createApp();
