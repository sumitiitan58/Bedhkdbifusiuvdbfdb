import {
  extractJsonObject,
  getServerSecret,
  listConfiguredProviders,
  normalizeMessages,
  parseJsonBody,
  resolveCorsHeaders,
  runPrepsAiWithFallback,
  runStructuredJsonWithFallback,
  sanitizeClientContext,
  sanitizeErrorMessage,
} from '../_lib/aiGateway.js';

function extractRouteSlug(request: Request): string {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/api\/gemini\/([^/?#]+)/i);
  return (match?.[1] ?? '').toLowerCase();
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: resolveCorsHeaders(request.headers.get('origin'), 'GET, POST, OPTIONS'),
  });
}

export async function GET(request: Request): Promise<Response> {
  const headers = resolveCorsHeaders(request.headers.get('origin'), 'GET, POST, OPTIONS');
  const route = extractRouteSlug(request);

  if (route === 'health') {
    const configuredProviders = listConfiguredProviders(process.env);
    return new Response(
      JSON.stringify({
        ok: true,
        service: 'prepskm-vercel-gemini',
        aiConfigured: configuredProviders.length > 0,
        providersReady: configuredProviders.length,
        configuredProviders,
      }),
      { status: 200, headers }
    );
  }

  return new Response(JSON.stringify({ ok: false, error: 'Not found.' }), {
    status: 404,
    headers,
  });
}

export async function POST(request: Request): Promise<Response> {
  const headers = resolveCorsHeaders(request.headers.get('origin'), 'GET, POST, OPTIONS');
  const route = extractRouteSlug(request);

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ ok: false, error: parsed.error }), {
      status: 400,
      headers,
    });
  }
  const body = parsed.data;

  // 1. /api/gemini/chat -> unified multi-provider failover gateway
  if (route === 'chat') {
    const messages = normalizeMessages(body);
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Please ask a question to Preps AI.' }),
        { status: 400, headers }
      );
    }
    const studentContext = sanitizeClientContext(body.context ?? body.studentContext ?? {});
    if (body.voiceMode) studentContext.voiceMode = true;

    const result = await runPrepsAiWithFallback({
      messages,
      context: studentContext,
      env: process.env,
    });
    if (!result.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        }),
        { status: 503, headers }
      );
    }
    return new Response(
      JSON.stringify({
        ok: true,
        reply: result.reply,
        provider: result.provider,
        suggestedFollowUps: result.suggestedFollowUps,
      }),
      { status: 200, headers }
    );
  }

  // 2. /api/gemini/mentor
  if (route === 'mentor') {
    const prompt = [
      `Student: ${String(body.studentName ?? 'Student').slice(0, 80)} | Track: ${String(body.cohortLabel ?? 'Class 12 JEE').slice(0, 80)}`,
      `Tests Taken: ${Number(body.attemptsCount ?? 0)} | Accuracy: ${Number(body.averageAccuracy ?? 0)}% | Latest IQ: ${Number(body.latestIqScore ?? 0)}/150 (Avg IQ: ${Number(body.averageIqScore ?? 0)}/150)`,
      `Pacing: ${JSON.stringify(body.paceSummary ?? {})}`,
      `Weekly Schedule Completion: ${Number(body.weeklyCompletionPercent ?? 0)}%`,
      `Subject Breakdown: ${JSON.stringify(body.subjectPerformance ?? [])}`,
      `Weakest Chapters: ${JSON.stringify(body.weakChapters ?? [])}`,
      body.userQuestion
        ? `Student Question: "${String(body.userQuestion).slice(0, 600)}"`
        : 'Provide a sharp high-ROI diagnosis of Exam IQ, must-do priorities, traps to skip, and a 7-day sprint strictly grounded in these subjects and chapters.',
      'Return ONLY valid JSON: { "headline": "", "iqDiagnosis": "", "mustDoPriorities": [], "avoidOrSkip": [], "sevenDayPlan": [{ "day": "", "focus": "" }], "directAnswer": "" }',
    ].join('\n');

    const result = await runStructuredJsonWithFallback({
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET/Boards mentor at PREPSKM.IN. Speak warmly in natural Hinglish with zero raw markdown symbols, staying strictly aligned to the student track, weak chapters, and exact question. Output ONLY valid JSON.',
      userPrompt: prompt,
      env: process.env,
      maxTokens: 2000,
    });
    if (!result.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        }),
        { status: 503, headers }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, mentor: result.data, provider: result.provider }),
      { status: 200, headers }
    );
  }

  // 3. /api/gemini/explain-question
  if (route === 'explain-question') {
    const subjectName = String(body.subjectName ?? '').trim().slice(0, 60);
    const chapterName = String(body.chapterName ?? '').trim().slice(0, 100);
    const questionText = String(body.questionText ?? '').trim().slice(0, 1500);
    if (!questionText) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Question text is required for explanation.' }),
        { status: 400, headers }
      );
    }

    const optionTexts = Array.isArray(body.optionTexts) ? body.optionTexts : [];
    const prompt = [
      `STRICT SUBJECT & CHAPTER LOCK: Subject = "${subjectName || 'Inferred from Question'}"${chapterName ? ` | Chapter = "${chapterName}"` : ''}`,
      `Question: ${questionText}`,
      optionTexts.length > 0
        ? `Options: ${optionTexts.map((o, i) => `${['A', 'B', 'C', 'D'][i] ?? i + 1}) ${String(o)}`).join(' | ')}`
        : '',
      `Official Correct Answer: ${String(body.correctAnswer ?? '')}`,
      `Student Answer: ${String(body.studentAnswer || 'Skipped')}`,
      body.solutionText ? `Existing Solution Note: ${String(body.solutionText).slice(0, 800)}` : '',
      'Explain strictly THIS exact question without drifting to unrelated topics. Return ONLY valid JSON: { "coreConcept": "", "stepByStep": ["step 1", "step 2"], "examShortcut": "" }',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await runStructuredJsonWithFallback({
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET mentor at PREPSKM.IN. Explain strictly the given question, subject, and chapter in crisp Hinglish under 180 words with zero raw markdown symbols. Output ONLY valid JSON.',
      userPrompt: prompt,
      env: process.env,
      maxTokens: 1400,
    });
    if (!result.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        }),
        { status: 503, headers }
      );
    }
    return new Response(
      JSON.stringify({
        ok: true,
        explanation: result.data,
        provider: result.provider,
      }),
      { status: 200, headers }
    );
  }

  // 4. /api/gemini/test-report
  if (route === 'test-report') {
    const prompt = [
      `Test: ${String(body.testTitle ?? 'Mock Test').slice(0, 120)} (${String(body.cohortLabel ?? 'JEE Main').slice(0, 60)})`,
      `Overall Metrics: ${JSON.stringify(body.metrics ?? {})}`,
      `Subject Breakdown: ${JSON.stringify(body.subjectScores ?? [])}`,
      `Attempt & Time Buckets: ${JSON.stringify(body.attemptBuckets ?? {})}`,
      `Difficulty Breakdown: ${JSON.stringify(body.difficultyBreakdown ?? [])}`,
      'Return ONLY valid JSON: { "verdict": "", "markLeakAnalysis": "", "strengths": [], "immediateFixes": [], "nextMockTarget": "" }',
    ].join('\n');

    const result = await runStructuredJsonWithFallback({
      systemPrompt:
        'You are a senior JEE/NEET exam analyst at PREPSKM.IN. Produce a concise, numbers-first post-test AI Report strictly in JSON.',
      userPrompt: prompt,
      env: process.env,
      maxTokens: 1800,
    });
    if (!result.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: result.error,
          attemptedProviders: result.attemptedProviders,
          providerErrors: result.providerErrors,
        }),
        { status: 503, headers }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, report: result.data, provider: result.provider }),
      { status: 200, headers }
    );
  }

  // 5. /api/gemini/extract-pdf
  if (route === 'extract-pdf') {
    const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : '';
    const mimeType = String(body.mimeType ?? 'application/pdf').slice(0, 80);
    const rawTextInput = String(body.rawTextInput ?? '').slice(0, 30_000);
    const defaultSubject = String(body.defaultSubject ?? 'Physics').slice(0, 40);
    const examType = String(body.examType ?? 'JEE Main').slice(0, 40);
    const maxQuestions = Math.min(40, Math.max(1, Number(body.maxQuestions) || 20));

    if (!fileBase64 && !rawTextInput.trim()) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Upload a PDF/image file or paste question text to extract questions.',
        }),
        { status: 400, headers }
      );
    }

    const instruction = [
      `Extract up to ${maxQuestions} exam questions from the attached ${examType} document/text.`,
      `Default subject if unspecified: ${defaultSubject}.`,
      'Return ONLY valid JSON: { "questions": [{ "questionNumber": 1, "subjectName": "Physics", "chapterName": "", "questionType": "single-mcq", "questionText": "", "optionTexts": ["", "", "", ""], "correctOptionIndices": [0], "numericalAnswer": "", "solutionText": "" }] }',
    ].join('\n');

    if (!fileBase64) {
      const result = await runStructuredJsonWithFallback({
        systemPrompt:
          'You are an expert Indian JEE/NEET exam digitizer. Extract accurate questions, verified answer keys, and concise solutions strictly in JSON.',
        userPrompt: `${instruction}\n\nSOURCE TEXT:\n${rawTextInput}`,
        env: process.env,
        maxTokens: 3200,
      });
      if (!result.ok) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: result.error,
            attemptedProviders: result.attemptedProviders,
            providerErrors: result.providerErrors,
          }),
          { status: 503, headers }
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          questions: Array.isArray(result.data.questions) ? result.data.questions : [],
          provider: result.provider,
        }),
        { status: 200, headers }
      );
    }

    const geminiKey = getServerSecret(process.env, 'GEMINI_API_KEY');
    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            'GEMINI_API_KEY is not configured in Vercel Environment Variables for PDF/image extraction.',
        }),
        { status: 503, headers }
      );
    }

    try {
      const resp = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: 'You are an expert Indian JEE/NEET exam digitizer. Extract clean questions, options, verified answers, and solutions strictly in JSON.',
                },
              ],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  { inline_data: { mime_type: mimeType, data: fileBase64 } },
                  {
                    text: rawTextInput
                      ? `${instruction}\n\nSOURCE TEXT:\n${rawTextInput}`
                      : instruction,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!resp.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: `Document extraction failed (status ${resp.status}).` }),
          { status: resp.status === 429 ? 429 : 502, headers }
        );
      }

      const data = (await resp.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const rawText =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => (typeof p?.text === 'string' ? p.text : ''))
          .join('') ?? '{"questions":[]}';
      const parsedJson = extractJsonObject(rawText);

      return new Response(
        JSON.stringify({
          ok: true,
          questions: Array.isArray(parsedJson.questions) ? parsedJson.questions : [],
        }),
        { status: 200, headers }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: sanitizeErrorMessage(err) || 'Unable to extract questions from this file right now.',
        }),
        { status: 502, headers }
      );
    }
  }

  return new Response(JSON.stringify({ ok: false, error: `Unknown route: /api/gemini/${route}` }), {
    status: 404,
    headers,
  });
}
