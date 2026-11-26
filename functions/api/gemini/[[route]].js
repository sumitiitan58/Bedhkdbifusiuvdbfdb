/**
 * Cloudflare Pages Catch-All Function for /api/gemini/*
 * Supports:
 *   GET  /api/gemini/health
 *   POST /api/gemini/mentor
 *   POST /api/gemini/extract-pdf
 *   POST /api/gemini/explain-question
 *   POST /api/gemini/test-report
 *   POST /api/gemini/chat (delegates to Preps AI multi-provider fallback)
 */

import {
  getSingleApiKey,
  normalizeMessages,
  resolveCorsHeaders,
  runPrepsAiWithFallback,
} from '../preps-ai.js';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const REQUEST_TIMEOUT_MS = 25000;

function jsonResponse(payload, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

async function callGeminiJson({ env, systemInstruction, contents, responseSchema }) {
  const apiKey = getSingleApiKey(env?.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Cloudflare Pages Environment Variables.'
    );
  }

  let lastError = 'Gemini AI request failed.';
  for (const key of [apiKey]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            ...(responseSchema ? { responseSchema } : {}),
          },
        }),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const rawText = Array.isArray(parts)
        ? parts
            .map((p) => (typeof p?.text === 'string' ? p.text : ''))
            .join('')
            .trim()
        : '';

      if (!rawText) {
        lastError = 'Empty Gemini response';
        continue;
      }

      return JSON.parse(rawText);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(lastError);
}

function formatError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: raw };
  }
  if (raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key was rejected. Verify GEMINI_API_KEY in Cloudflare Pages environment settings.',
    };
  }
  if (raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API quota reached temporarily. Please wait a moment and try again.',
    };
  }
  return { status: 502, message: 'AI request failed temporarily. Please try again.' };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('origin') || '';
  return new Response(null, { status: 204, headers: resolveCorsHeaders(origin) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';
  const corsHeaders = resolveCorsHeaders(origin);
  const path = new URL(request.url).pathname.replace(/\/+$/, '');

  if (path.endsWith('/health')) {
    const hasGeminiKey = Boolean(getSingleApiKey(env?.GEMINI_API_KEY));
    return jsonResponse(
      {
        ok: true,
        service: 'prepskm-cloudflare-pages-gemini',
        aiConfigured: hasGeminiKey,
      },
      200,
      corsHeaders
    );
  }

  return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, corsHeaders);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';
  const corsHeaders = resolveCorsHeaders(origin);
  const path = new URL(request.url).pathname.replace(/\/+$/, '');

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON request body.' }, 400, corsHeaders);
  }

  try {
    if (path.endsWith('/chat')) {
      const messages = normalizeMessages(body);
      if (messages.length === 0) {
        return jsonResponse(
          { ok: false, error: 'Please ask a question for Preps AI.' },
          400,
          corsHeaders
        );
      }
      const studentContext =
        body?.context && typeof body.context === 'object'
          ? { ...body.context }
          : body?.studentContext && typeof body.studentContext === 'object'
            ? { ...body.studentContext }
            : {};
      if (body?.voiceMode) {
        studentContext.voiceMode = true;
      }
      const fallbackResult = await runPrepsAiWithFallback({
        messages,
        context: studentContext,
        env,
      });
      if (!fallbackResult.ok) {
        return jsonResponse({ ok: false, error: fallbackResult.error }, 503, corsHeaders);
      }
      return jsonResponse(fallbackResult, 200, corsHeaders);
    }

    if (path.endsWith('/mentor')) {
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
      } = body ?? {};

      const prompt = [
        `Student: ${String(studentName).slice(0, 100)} | Track: ${String(cohortLabel).slice(0, 100)}`,
        `Tests Taken: ${Number(attemptsCount) || 0} | Overall Accuracy: ${Number(averageAccuracy) || 0}% | Latest IQ Score: ${Number(latestIqScore) || 0}/150 (Avg IQ: ${Number(averageIqScore) || 0}/150)`,
        `Pacing Totals -> Too Fast (rushing): ${paceSummary.tooFast ?? 0}, Optimal Pace: ${paceSummary.optimal ?? 0}, Too Slow: ${paceSummary.tooSlow ?? 0}, Skipped: ${paceSummary.unattempted ?? 0}`,
        `Weekly Schedule Completion: ${Number(weeklyCompletionPercent) || 0}%`,
        `Subject Breakdown: ${JSON.stringify(subjectPerformance).slice(0, 2000)}`,
        `Weakest Chapters: ${JSON.stringify(weakChapters).slice(0, 2000)}`,
        userQuestion
          ? `Student's Direct Question: "${String(userQuestion).slice(0, 600)}"`
          : 'Student wants a clear high-ROI diagnosis of their Exam IQ, what is strictly essential ("Kya Jaruri Hai"), what to avoid/skip ("Kya Jaruri Nahi Hai"), and a crisp 7-day execution plan.',
      ].join('\n');

      const parsed = await callGeminiJson({
        env,
        systemInstruction:
          'You are Preps AI, a friendly Indian JEE Main, JEE Advanced, NEET UG & CBSE Board bhaiya/mentor at PREPSKM.IN. ' +
          'Speak warmly, practically, and encouragingly in natural Hinglish (conversational Hindi-English mix) so students grasp advice immediately. ' +
          'Give concrete, honest, high-ROI advice tailored to the student track and real stats. Never use raw markdown symbols (#, **, *, _, backticks).',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        responseSchema: {
          type: 'OBJECT',
          properties: {
            headline: { type: 'STRING' },
            iqDiagnosis: { type: 'STRING' },
            mustDoPriorities: { type: 'ARRAY', items: { type: 'STRING' } },
            avoidOrSkip: { type: 'ARRAY', items: { type: 'STRING' } },
            sevenDayPlan: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  day: { type: 'STRING' },
                  focus: { type: 'STRING' },
                },
                required: ['day', 'focus'],
              },
            },
            directAnswer: { type: 'STRING' },
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
      });

      return jsonResponse({ ok: true, mentor: parsed }, 200, corsHeaders);
    }

    if (path.endsWith('/extract-pdf')) {
      const {
        fileBase64,
        mimeType = 'application/pdf',
        rawTextInput = '',
        defaultSubject = 'Physics',
        examType = 'JEE Main',
        maxQuestions = 20,
      } = body ?? {};

      if (!fileBase64 && !String(rawTextInput).trim()) {
        return jsonResponse(
          { ok: false, error: 'Upload a PDF/image file or paste question text to extract questions.' },
          400,
          corsHeaders
        );
      }

      const safeMime = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(
        String(mimeType)
      )
        ? String(mimeType)
        : 'application/pdf';

      const instruction = [
        `Extract up to ${Math.min(40, Math.max(1, Number(maxQuestions) || 20))} exam questions from the attached ${String(examType).slice(0, 60)} document/text.`,
        `Default subject if not specified in the paper: ${String(defaultSubject).slice(0, 60)}.`,
        'Rules:',
        '- Identify questionType accurately as "single-mcq", "multi-mcq", or "integer".',
        '- For single-mcq and multi-mcq, extract exactly 4 clean optionTexts and set correctOptionIndices (0-based indices 0..3).',
        '- For integer questions, set numericalAnswer as a clean number string and leave optionTexts empty.',
        '- Always include a concise, accurate solutionText explaining how to arrive at the answer.',
        '- Detect subjectName (Physics, Chemistry, Mathematics, or Biology) and chapterName for each question.',
      ].join('\n');

      const parts = [];
      if (fileBase64) {
        parts.push({
          inline_data: {
            mime_type: safeMime,
            data: String(fileBase64),
          },
        });
      }
      parts.push({
        text: rawTextInput
          ? `${instruction}\n\nSOURCE TEXT:\n${String(rawTextInput).slice(0, 30000)}`
          : instruction,
      });

      const parsed = await callGeminiJson({
        env,
        systemInstruction:
          'You are an expert Indian JEE/NEET exam digitizer. Extract clean, accurate questions, options, verified answer keys, and concise step-by-step solutions in strict JSON.',
        contents: [{ role: 'user', parts }],
        responseSchema: {
          type: 'OBJECT',
          properties: {
            questions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  questionNumber: { type: 'INTEGER' },
                  subjectName: { type: 'STRING' },
                  chapterName: { type: 'STRING' },
                  questionType: { type: 'STRING' },
                  questionText: { type: 'STRING' },
                  optionTexts: { type: 'ARRAY', items: { type: 'STRING' } },
                  correctOptionIndices: { type: 'ARRAY', items: { type: 'INTEGER' } },
                  numericalAnswer: { type: 'STRING' },
                  solutionText: { type: 'STRING' },
                },
                required: ['questionNumber', 'subjectName', 'questionType', 'questionText', 'solutionText'],
              },
            },
          },
          required: ['questions'],
        },
      });

      return jsonResponse(
        { ok: true, questions: Array.isArray(parsed?.questions) ? parsed.questions : [] },
        200,
        corsHeaders
      );
    }

    if (path.endsWith('/explain-question')) {
      const {
        subjectName = 'Science',
        chapterName = '',
        questionText = '',
        optionTexts = [],
        correctAnswer = '',
        studentAnswer = '',
        solutionText = '',
      } = body ?? {};

      const prompt = [
        `Subject: ${String(subjectName).slice(0, 80)}${chapterName ? ` | Chapter: ${String(chapterName).slice(0, 120)}` : ''}`,
        `Question: ${String(questionText).slice(0, 2000)}`,
        Array.isArray(optionTexts) && optionTexts.length > 0
          ? `Options: ${optionTexts
              .slice(0, 6)
              .map((o, i) => `${['A', 'B', 'C', 'D'][i] ?? i + 1}) ${String(o).slice(0, 400)}`)
              .join(' | ')}`
          : '',
        `Official Correct Answer: ${String(correctAnswer).slice(0, 200)}`,
        `Student's Answer: ${String(studentAnswer || 'Skipped').slice(0, 200)}`,
        solutionText ? `Existing Solution Note: ${String(solutionText).slice(0, 1000)}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const parsed = await callGeminiJson({
        env,
        systemInstruction:
          'You are Preps AI, a friendly Indian JEE/NEET bhaiya and mentor at PREPSKM.IN. Explain the question in simple, relatable Hinglish (conversational Hindi-English mix, zero robotic jargon, zero raw markdown like **, #, _, backticks) in 3 compact sections: (1) Core Concept & Formula, (2) Step-by-Step Solving, (3) 10-Second Exam Shortcut / Mistake to Avoid. Keep it under 180 words.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        responseSchema: {
          type: 'OBJECT',
          properties: {
            coreConcept: { type: 'STRING' },
            stepByStep: { type: 'ARRAY', items: { type: 'STRING' } },
            examShortcut: { type: 'STRING' },
          },
          required: ['coreConcept', 'stepByStep', 'examShortcut'],
        },
      });

      return jsonResponse({ ok: true, explanation: parsed }, 200, corsHeaders);
    }

    if (path.endsWith('/test-report')) {
      const {
        testTitle = 'Mock Test',
        cohortLabel = 'JEE Main',
        metrics = {},
        subjectScores = [],
        attemptBuckets = {},
        difficultyBreakdown = [],
      } = body ?? {};

      const prompt = [
        `Test: ${String(testTitle).slice(0, 160)} (${String(cohortLabel).slice(0, 80)})`,
        `Overall Metrics: ${JSON.stringify(metrics).slice(0, 1500)}`,
        `Subject Breakdown: ${JSON.stringify(subjectScores).slice(0, 2000)}`,
        `Attempt & Time Buckets: ${JSON.stringify(attemptBuckets).slice(0, 1500)}`,
        `Difficulty Breakdown: ${JSON.stringify(difficultyBreakdown).slice(0, 1500)}`,
        'Generate a sharp post-test executive report covering score verdict, biggest mark-leak source (negative marks / silly mistakes / overtime), top 3 immediate fixes before next mock, and a realistic target score jump.',
      ].join('\n');

      const parsed = await callGeminiJson({
        env,
        systemInstruction:
          'You are a top JEE/NEET exam analyst at PREPSKM.IN. Produce a concise, numbers-first post-test AI Report in strict JSON.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        responseSchema: {
          type: 'OBJECT',
          properties: {
            verdict: { type: 'STRING' },
            markLeakAnalysis: { type: 'STRING' },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            immediateFixes: { type: 'ARRAY', items: { type: 'STRING' } },
            nextMockTarget: { type: 'STRING' },
          },
          required: ['verdict', 'markLeakAnalysis', 'strengths', 'immediateFixes', 'nextMockTarget'],
        },
      });

      return jsonResponse({ ok: true, report: parsed }, 200, corsHeaders);
    }

    return jsonResponse({ ok: false, error: 'Unknown Gemini API endpoint.' }, 404, corsHeaders);
  } catch (err) {
    const { status, message } = formatError(err);
    return jsonResponse({ ok: false, error: message }, status, corsHeaders);
  }
}
