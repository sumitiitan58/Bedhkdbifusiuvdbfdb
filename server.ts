import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CANONICAL_ORIGIN,
  buildSitemapXml,
  getMaterialRoutePath,
  getMockTestSlug,
  type SitemapUrlEntry,
} from './src/utils/seoHelpers';
import { JEE_CONCISE_MATERIALS } from './src/data/jeeConciseNotesCatalog';
import { STARTER_MATERIALS, STARTER_TESTS } from './src/services/starterCatalog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_MODEL = 'gemini-4-hydrogen';

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

    // 1. Official 82 JEE Concise Notes + Starter Materials
    for (const mat of [...JEE_CONCISE_MATERIALS, ...STARTER_MATERIALS]) {
      if (mat.isPublished === false) continue;
      const routePath = getMaterialRoutePath(mat);
      entries.push({
        loc: `${CANONICAL_ORIGIN}${routePath}`,
        lastmod: toIsoDate(mat.updatedAt),
        changefreq: 'weekly',
        priority: '0.85',
      });
    }

    // 2. Starter CBT Mocks
    for (const test of STARTER_TESTS) {
      if (test.isPublished === false || test.destination === 'DPP') continue;
      const slug = getMockTestSlug(test);
      entries.push({
        loc: `${CANONICAL_ORIGIN}/cbt-mocks/${slug}`,
        lastmod: toIsoDate(test.updatedAt ?? test.createdAtIso),
        changefreq: 'weekly',
        priority: '0.9',
      });
    }

    // 3. Dynamically query published materials & CBT mocks from Firestore REST API (non-blocking fallback)
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
                  fields?: Record<string, { stringValue?: string; booleanValue?: boolean }>;
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
            const routePath = getMaterialRoutePath({
              id,
              title,
              slug: f.slug?.stringValue,
              seoSlug: f.seoSlug?.stringValue,
              sectionName: f.sectionName?.stringValue ?? '',
              resourceType: (f.resourceType?.stringValue as 'PDF' | 'VIDEO' | 'BOTH' | undefined) ?? 'PDF',
            });
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
            if (f.destination?.stringValue === 'DPP') continue;
            const id = doc.name?.split('/').pop() ?? '';
            const title = f.title?.stringValue ?? '';
            if (!id && !title) continue;
            const slug = getMockTestSlug({
              id,
              title,
              slug: f.slug?.stringValue,
            });
            const lastmod = toIsoDate(f.updatedAt?.stringValue || doc.updateTime);
            entries.push({
              loc: `${CANONICAL_ORIGIN}/cbt-mocks/${slug}`,
              lastmod,
              changefreq: 'weekly',
              priority: '0.9',
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
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`PREPSKM.IN server listening on http://0.0.0.0:${port}`);
  });
}

void createApp();
