/**
 * Preps AI Expert Tutor & Mentor Studio Function (/api/ai/tutor-studio)
 *
 * Powers three structured academic mentoring workflows using the 6-provider
 * automatic failover engine (Groq -> Gemini -> DeepSeek -> OpenRouter -> Mistral -> Cloudflare Workers AI):
 *   1. analyze-sheet      : Accurately analyzes student Google Sheet performance data for constructive feedback
 *   2. learning-path      : Summarizes chapters into personalized step-by-step learning paths using sheet + Keep notes
 *   3. practice-questions : Generates relevant, syllabus-aligned MCQ practice questions with hints & explanations
 */

import { resolveCorsHeaders, runPrepsAiWithFallback } from '../preps-ai.js';

export function extractJsonObject(rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) throw new Error('Empty AI tutor response');
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Could not parse structured JSON from AI tutor response');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

export function buildTutorStudioPrompt(action, payload = {}) {
  const cohortLabel = String(payload.cohortLabel || 'Class 12 JEE').slice(0, 80);
  const studentName = String(payload.studentName || 'Student').slice(0, 80);

  if (action === 'analyze-sheet') {
    const analysis = payload.sheetAnalysis || {};
    const keepNotes = Array.isArray(payload.keepNotes) ? payload.keepNotes.slice(0, 6) : [];
    const prompt = [
      `Student: ${studentName} | Track: ${cohortLabel}`,
      `Google Sheet Analyzed: "${String(analysis.sheetTitle || 'Student Performance Sheet').slice(0, 120)}" (Tab: "${String(analysis.tabName || 'Data').slice(0, 80)}")`,
      `Verified Quantitative Metrics (DO NOT alter these numbers):`,
      JSON.stringify(
        {
          parsedRows: analysis.parsedCount ?? 0,
          overallScorePercent: analysis.overallScorePercent ?? 0,
          overallAccuracyPercent: analysis.overallAccuracyPercent ?? 0,
          trend: analysis.trend ?? 'Steady',
          trendDeltaPercent: analysis.trendDeltaPercent ?? 0,
          strongestSubject: analysis.strongestSubject ?? null,
          weakestSubject: analysis.weakestSubject ?? null,
          subjectSummaries: Array.isArray(analysis.subjectSummaries)
            ? analysis.subjectSummaries.slice(0, 8)
            : [],
          weakChapters: Array.isArray(analysis.weakChapters)
            ? analysis.weakChapters.slice(0, 8)
            : [],
          sampleRecords: Array.isArray(analysis.records) ? analysis.records.slice(0, 12) : [],
        },
        null,
        2
      ),
      keepNotes.length > 0
        ? `Student Google Keep Study Notes:\n${JSON.stringify(
            keepNotes.map((n) => ({
              title: String(n.title || '').slice(0, 100),
              subject: String(n.subject || '').slice(0, 50),
              chapter: String(n.chapter || '').slice(0, 80),
              content: String(n.content || '').slice(0, 400),
            }))
          )}`
        : 'Student Google Keep Study Notes: None attached yet.',
      '',
      'Return ONLY valid JSON with this exact shape (write every string in warm, relatable, student-friendly Hinglish with ZERO raw markdown symbols like **, #, *, _, or backticks):',
      '{',
      '  "verdict": "2-sentence friendly Hinglish mentor summary citing exact percentages from the sheet",',
      '  "progressTrendNote": "1-2 sentences in simple Hinglish explaining the score trend and consistency pattern",',
      '  "strengths": ["2-3 specific strengths backed by sheet numbers in clear Hinglish"],',
      '  "priorityWeakAreas": ["2-4 highest-ROI weak chapters/concepts from the sheet in simple Hinglish"],',
      '  "constructiveAdvice": ["3-4 practical Hinglish study habits tied to the data and Keep notes"],',
      '  "recommendedNextAction": "1 clear immediate 30-minute Hinglish study step to take right now"',
      '}',
    ].join('\n');

    return {
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET/Boards bhaiya and mentor on PREPSKM.IN. Accurately analyze the provided Google Sheet student performance metrics and Google Keep notes to give warm, constructive, student-friendly Hinglish feedback. Never invent numbers outside the sheet data and never use raw markdown symbols (#, **, *, _, backticks). Output ONLY valid JSON.',
      userPrompt: prompt,
    };
  }

  if (action === 'learning-path') {
    const subjectName = String(payload.subjectName || 'Physics').slice(0, 80);
    const chapterName = String(payload.chapterName || 'Electrostatics').slice(0, 120);
    const currentAccuracy =
      payload.currentAccuracy !== undefined && payload.currentAccuracy !== null
        ? Number(payload.currentAccuracy)
        : null;
    const sheetNotes = String(payload.sheetNotes || '').slice(0, 400);
    const keepNotes = Array.isArray(payload.keepNotes) ? payload.keepNotes.slice(0, 5) : [];

    const prompt = [
      `Student: ${studentName} | Track: ${cohortLabel}`,
      `Target Subject: ${subjectName} | Target Chapter: ${chapterName}`,
      currentAccuracy !== null && Number.isFinite(currentAccuracy)
        ? `Current Chapter Accuracy from Google Sheet: ${currentAccuracy}%`
        : 'Current Chapter Accuracy: Not logged yet (build a balanced core-to-exam path).',
      sheetNotes ? `Recent Error Notes from Sheet: ${sheetNotes}` : '',
      keepNotes.length > 0
        ? `Relevant Google Keep Notes:\n${keepNotes
            .map((n) => `- ${String(n.title || '')}: ${String(n.content || '').slice(0, 350)}`)
            .join('\n')}`
        : '',
      '',
      'Summarize this chapter into a personalized, student-friendly Hinglish learning path (like a friendly Indian senior mentor). Avoid textbook jargon and NEVER use raw markdown symbols (**, #, *, _, backticks). Return ONLY valid JSON with this exact shape:',
      '{',
      `  "chapterName": "${chapterName.replace(/"/g, '\\"')}",`,
      `  "subjectName": "${subjectName.replace(/"/g, '\\"')}",`,
      '  "readinessLevel": "Foundation Rebuild | Core Strengthening | Exam Polish",',
      '  "chapterSummary": "Concise 3-4 sentence easy-to-understand Hinglish conceptual overview connecting the big ideas",',
      '  "keyFormulasAndConcepts": ["4-6 essential formulas or mental models explained simply in plain text"],',
      '  "learningSteps": [',
      '    {',
      '      "stepNumber": 1,',
      '      "phase": "Short phase title (e.g., Concept Clarity)",',
      '      "durationMinutes": 25,',
      '      "objective": "Clear measurable outcome in simple Hinglish",',
      '      "actionItems": ["2-3 specific, easy-to-follow Hinglish study tasks"]',
      '    }',
      '  ],',
      '  "examTrapsToAvoid": ["3-4 common NTA/Board pitfalls explained in simple Hinglish"],',
      '  "keepChecklistTitle": "Short Google Keep note title for this chapter path"',
      '}',
      'Provide 4 sequential steps in learningSteps.',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET/Boards bhaiya and mentor on PREPSKM.IN. Create accurate, structured, student-friendly Hinglish chapter summaries and step-by-step learning paths grounded in the student sheet performance and Keep notes. Never use raw markdown symbols (#, **, *, _, backticks). Output ONLY valid JSON.',
      userPrompt: prompt,
    };
  }

  if (action === 'practice-questions') {
    const subjectName = String(payload.subjectName || 'Physics').slice(0, 80);
    const chapterName = String(payload.chapterName || 'Electrostatics').slice(0, 120);
    const difficulty = String(payload.difficulty || 'Exam Level').slice(0, 40);
    const count = Math.min(5, Math.max(3, Number(payload.count) || 3));
    const focusNote = String(payload.focusNote || '').slice(0, 400);

    const prompt = [
      `Student Track: ${cohortLabel}`,
      `Subject: ${subjectName} | Chapter: ${chapterName}`,
      `Difficulty: ${difficulty} | Number of Questions: ${count}`,
      focusNote ? `Specific Weak Area / Keep Note Focus: ${focusNote}` : '',
      '',
      `Generate exactly ${count} relevant, conceptually accurate single-choice MCQ practice questions with 4 crisp, clean options (A-D).`,
      'IMPORTANT STYLE RULES:',
      '- Keep each question clear and exam-style, and keep each option crisp so it looks great as an image card.',
      '- Frame every "hint" and "explanation" in simple, friendly, relatable Hinglish (like an Indian JEE/NEET bhaiya explaining directly to a student) — avoid robotic textbook jargon.',
      '- NEVER use raw markdown formatting characters (#, **, *, _, `, >) anywhere inside question, options, hint, or explanation.',
      'Return ONLY valid JSON with this exact shape:',
      '{',
      '  "questions": [',
      '    {',
      '      "id": "q1",',
      '      "question": "Clear exam-style question statement (plain text, no markdown)",',
      '      "options": ["Option A", "Option B", "Option C", "Option D"],',
      '      "correctIndex": 0,',
      `      "difficulty": "${difficulty.replace(/"/g, '\\"')}",`,
      '      "conceptTag": "Short concept tag (2-4 words)",',
      '      "hint": "Simple, friendly 1-sentence Hinglish nudge without giving away the answer",',
      '      "explanation": "Easy-to-understand step-by-step Hinglish explanation showing why the right option works and the common exam trap to avoid (no markdown)"',
      '    }',
      '  ]',
      '}',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET/Boards mentor and question author on PREPSKM.IN. Double-check every calculation so correctIndex (0..3) matches the verified answer in options. Write every hint and explanation in natural, relatable Hinglish without robotic textbook jargon or raw markdown symbols (#, **, *, _, backticks). Output ONLY valid JSON.',
      userPrompt: prompt,
    };
  }

  throw new Error('Unsupported tutor studio action.');
}

export async function runTutorStudioWithFallback({
  action,
  payload,
  env = {},
  fetchImpl = globalThis.fetch,
}) {
  const { systemPrompt, userPrompt } = buildTutorStudioPrompt(action, payload);
  const result = await runPrepsAiWithFallback({
    messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }],
    context: { tutorStudioAction: action },
    env,
    fetchImpl,
    maxTokens: 2400,
    jsonMode: true,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const parsed = extractJsonObject(result.reply);
  return {
    ok: true,
    data: parsed,
    provider: result.provider,
  };
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('origin') || '';
  return new Response(null, { status: 204, headers: resolveCorsHeaders(origin) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin') || '';
  const headers = resolveCorsHeaders(origin);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON request payload.' }),
      { status: 400, headers }
    );
  }

  const action = String(body?.action || '').trim();
  if (!['analyze-sheet', 'learning-path', 'practice-questions'].includes(action)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid tutor studio action.' }),
      { status: 400, headers }
    );
  }

  try {
    const result = await runTutorStudioWithFallback({
      action,
      payload: body.payload ?? {},
      env,
    });
    if (!result.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: result.error }),
        { status: 503, headers }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, result: result.data, provider: result.provider }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'The AI Tutor could not format the response cleanly. Please try again in a moment.',
      }),
      { status: 502, headers }
    );
  }
}
