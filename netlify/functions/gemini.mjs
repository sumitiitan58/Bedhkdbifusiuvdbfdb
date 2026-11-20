import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the host. Add GEMINI_API_KEY in your hosting Environment Variables to enable Gemini AI features.'
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

function formatGeminiError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: raw };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key was rejected. Please verify GEMINI_API_KEY in your hosting environment settings.',
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

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (path.endsWith('/health')) {
    return jsonResponse({
      ok: true,
      service: 'prepskm-netlify-api',
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON request body.' }, 400);
  }

  try {
    const ai = getGeminiClient();

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
              headline: { type: Type.STRING },
              iqDiagnosis: { type: Type.STRING },
              mustDoPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
              avoidOrSkip: { type: Type.ARRAY, items: { type: Type.STRING } },
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
              },
              directAnswer: { type: Type.STRING },
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

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return jsonResponse({ ok: true, mentor: parsed });
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
          400
        );
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

      const parts = [];
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
                    questionType: { type: Type.STRING },
                    questionText: { type: Type.STRING },
                    optionTexts: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctOptionIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
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

      const parsed = JSON.parse((response.text ?? '{"questions":[]}').trim());
      return jsonResponse({ ok: true, questions: Array.isArray(parsed.questions) ? parsed.questions : [] });
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
        `Subject: ${subjectName}${chapterName ? ` | Chapter: ${chapterName}` : ''}`,
        `Question: ${questionText}`,
        Array.isArray(optionTexts) && optionTexts.length > 0
          ? `Options: ${optionTexts.map((o, i) => `${['A', 'B', 'C', 'D'][i] ?? i + 1}) ${o}`).join(' | ')}`
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
              stepByStep: { type: Type.ARRAY, items: { type: Type.STRING } },
              examShortcut: { type: Type.STRING },
            },
            required: ['coreConcept', 'stepByStep', 'examShortcut'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return jsonResponse({ ok: true, explanation: parsed });
    }

    return jsonResponse({ ok: false, error: 'Unknown Gemini API endpoint.' }, 404);
  } catch (err) {
    const { status, message } = formatGeminiError(err);
    return jsonResponse({ ok: false, error: message }, status);
  }
}
