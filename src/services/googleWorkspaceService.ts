import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import type { TestAttemptRecord } from '../types';
import type { PrepScoreActionItem, PrepScoreReport } from '../utils/prepScoreEngine';

// Strict in-memory access token cache (NEVER persisted in localStorage or sessionStorage)
let cachedWorkspaceToken: string | null = null;
let isConnectingWorkspace = false;
const tokenListeners = new Set<(connected: boolean) => void>();

function notifyListeners() {
  const connected = Boolean(cachedWorkspaceToken);
  for (const listener of tokenListeners) {
    listener(connected);
  }
}

onAuthStateChanged(auth, (user: User | null) => {
  if (!user && !isConnectingWorkspace) {
    cachedWorkspaceToken = null;
    notifyListeners();
  }
});

export function subscribeWorkspaceAuth(listener: (connected: boolean) => void): () => void {
  tokenListeners.add(listener);
  listener(Boolean(cachedWorkspaceToken));
  return () => {
    tokenListeners.delete(listener);
  };
}

export function hasWorkspaceAccessToken(): boolean {
  return Boolean(cachedWorkspaceToken);
}

/**
 * Hydrates the short-lived Google OAuth 2.0 access token in JS memory after
 * unified Firebase Google SSO sign-in. Never writes tokens to web storage.
 */
export function setWorkspaceAccessToken(token: string | null): void {
  const cleaned = typeof token === 'string' && token.trim() ? token.trim() : null;
  cachedWorkspaceToken = cleaned;
  notifyListeners();
}

export function clearWorkspaceAccessToken(): void {
  cachedWorkspaceToken = null;
  notifyListeners();
}

/**
 * Runs unified Google Sign-In (Firebase Auth + Google Sheets & Google Tasks OAuth 2.0 SSO)
 * or refreshes the short-lived in-memory OAuth access token after a full page reload.
 */
export async function connectGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isConnectingWorkspace = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Could not obtain a Google OAuth access token. Please allow Sheets and Tasks permissions during Google Sign-In.'
      );
    }
    setWorkspaceAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } finally {
    isConnectingWorkspace = false;
  }
}

async function requireToken(): Promise<string> {
  if (!cachedWorkspaceToken) {
    throw new Error('Sign in with Google Workspace first to authorize Google Sheets and Google Tasks.');
  }
  return cachedWorkspaceToken;
}

export interface ExportSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export interface GoogleStudyTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  updated?: string;
}

export interface GoogleTaskListResult {
  taskListId: string;
  taskListTitle: string;
  tasks: GoogleStudyTaskItem[];
}

const DEFAULT_STUDY_TASK_LIST_TITLE = 'Prepskm Study Tasks';

async function findOrCreateStudyTaskList(
  token: string,
  createIfMissing: boolean
): Promise<{ id: string; title: string } | null> {
  const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (listsRes.status === 401 || listsRes.status === 403) {
    clearWorkspaceAccessToken();
    throw new Error('Google Tasks permission expired or missing. Please reconnect with Google.');
  }
  if (!listsRes.ok) {
    const errText = await listsRes.text();
    throw new Error(`Could not load Google Task lists (${listsRes.status}): ${errText.slice(0, 140)}`);
  }

  const listsData = (await listsRes.json()) as {
    items?: Array<{ id: string; title: string }>;
  };

  const existing = listsData.items?.find(
    (l) =>
      l.title.trim().toLowerCase() === DEFAULT_STUDY_TASK_LIST_TITLE.toLowerCase() ||
      l.title.trim().toLowerCase() === 'prepskm 850+ prep plan'
  );
  if (existing) {
    return existing;
  }
  if (!createIfMissing) {
    return listsData.items?.[0] ?? null;
  }

  const createListRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: DEFAULT_STUDY_TASK_LIST_TITLE }),
  });
  if (!createListRes.ok) {
    throw new Error('Failed to create the Prepskm Study Tasks list in Google Tasks.');
  }
  return (await createListRes.json()) as { id: string; title: string };
}

/**
 * Creates a formatted 3-tab Google Spreadsheet for detailed test analytics:
 * 1) "Prep Score (0-100)" — readiness score, 4-factor breakdown, key drivers & 85+ action items
 * 2) "Subject & Chapter Analytics" — aggregated subject accuracy, score %, and weak chapters
 * 3) "Mock History" — test-by-test score, accuracy, pacing, and Exam IQ log
 */
export async function exportPrepScoreToGoogleSheets(params: {
  report: PrepScoreReport;
  attempts: TestAttemptRecord[];
  cohortLabel: string;
  studentName: string;
}): Promise<ExportSheetResult> {
  const token = await requireToken();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const title = `Prepskm Test Analytics & Prep Score (${params.cohortLabel}) - ${dateStamp}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Prep Score (0-100)' } },
        { properties: { title: 'Subject & Chapter Analytics' } },
        { properties: { title: 'Mock History' } },
      ],
    }),
  });

  if (createRes.status === 401 || createRes.status === 403) {
    clearWorkspaceAccessToken();
    throw new Error('Google Sheets permission expired or missing. Please reconnect with Google.');
  }
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Google Sheets creation failed (${createRes.status}): ${errText.slice(0, 140)}`);
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  const summarySheetTitle = created.sheets?.[0]?.properties?.title || 'Prep Score (0-100)';
  const analyticsSheetTitle = created.sheets?.[1]?.properties?.title || 'Subject & Chapter Analytics';
  const historySheetTitle = created.sheets?.[2]?.properties?.title || 'Mock History';

  const summaryRows: Array<Array<string | number>> = [
    ['PREPSKM.IN — Prep Score & Test Analytics Report', '', '', ''],
    ['Student', params.studentName, 'Track', params.cohortLabel],
    ['Generated On', dateStamp, 'Readiness Tier', params.report.tier],
    [
      'Prep Score',
      `${params.report.score} / 100`,
      'Weekly Delta',
      `${params.report.deltaThisWeek >= 0 ? '+' : ''}${params.report.deltaThisWeek} (${params.report.deltaLabel})`,
    ],
    ['Points to 85+ Target', params.report.pointsTo85, 'Active Streak', `${params.report.diagnostics.activeStreakDays} days`],
    ['', '', '', ''],
    ['4-Factor Breakdown', 'Earned', 'Max', 'Weight & Diagnostic'],
    ...params.report.factors.map((f) => [
      f.label,
      f.score,
      f.maxScore,
      `${f.weightPercent}% — ${f.summary}`,
    ]),
    ['', '', '', ''],
    ['Key Score Drivers', 'Impact (pts)', 'Summary', ''],
    ...params.report.insights.map((ins) => [ins.headline, ins.deltaPts, ins.detail, '']),
    ['', '', '', ''],
    ['Chapter Action Items (85+ Roadmap)', 'Subject', 'Est. Gain (pts)', 'Focus Guidance'],
    ...params.report.actionItems.map((act) => [
      act.title,
      act.subjectName,
      `+${act.estimatedGainPts}`,
      act.reason,
    ]),
  ];

  // Aggregate subject and chapter analytics across all attempts
  const subjectAgg = new Map<
    string,
    { score: number; maxScore: number; correct: number; incorrect: number; unattempted: number; timeSum: number; count: number }
  >();
  const chapterAgg = new Map<
    string,
    { subject: string; chapter: string; correct: number; incorrect: number; unattempted: number }
  >();

  for (const att of params.attempts) {
    for (const s of att.subjectScores ?? []) {
      const cur = subjectAgg.get(s.subjectName) ?? {
        score: 0,
        maxScore: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        timeSum: 0,
        count: 0,
      };
      cur.score += s.score;
      cur.maxScore += s.maxScore;
      cur.correct += s.correct;
      cur.incorrect += s.incorrect;
      cur.unattempted += s.unattempted;
      cur.timeSum += s.avgTimeSeconds;
      cur.count += 1;
      subjectAgg.set(s.subjectName, cur);
    }
    for (const ch of att.chapterScores ?? []) {
      const key = `${ch.subjectName}::${ch.chapterName}`;
      const cur = chapterAgg.get(key) ?? {
        subject: ch.subjectName,
        chapter: ch.chapterName,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
      };
      cur.correct += ch.correct;
      cur.incorrect += ch.incorrect;
      cur.unattempted += Math.max(0, ch.total - ch.correct - ch.incorrect);
      chapterAgg.set(key, cur);
    }
  }

  const subjectRows: Array<Array<string | number>> = [
    ['Subject Performance Summary', 'Score', 'Max Score', 'Accuracy %', 'Correct', 'Wrong', 'Avg Sec/Q'],
    ...(subjectAgg.size > 0
      ? Array.from(subjectAgg.entries()).map(([subject, v]) => {
          const att = v.correct + v.incorrect;
          const acc = att > 0 ? Math.round((v.correct / att) * 100) : 0;
          return [
            subject,
            v.score,
            v.maxScore,
            acc,
            v.correct,
            v.incorrect,
            Math.round(v.timeSum / Math.max(1, v.count)),
          ];
        })
      : [['No subject breakdown logged yet', 0, 0, 0, 0, 0, 0]]),
    ['', '', '', '', '', '', ''],
    ['Chapter Breakdown', 'Subject', 'Correct', 'Wrong', 'Skipped', 'Accuracy %', 'Priority'],
    ...(chapterAgg.size > 0
      ? Array.from(chapterAgg.values())
          .map((c) => {
            const att = c.correct + c.incorrect;
            const acc = att > 0 ? Math.round((c.correct / att) * 100) : 0;
            const priority = acc < 55 || c.incorrect >= 2 ? 'High Focus' : acc < 80 ? 'Revise' : 'Strong';
            return [c.chapter, c.subject, c.correct, c.incorrect, c.unattempted, acc, priority];
          })
          .sort((a, b) => Number(a[5]) - Number(b[5]))
      : [['Submit a CBT mock to unlock chapter-level accuracy', '', 0, 0, 0, 0, '—']]),
  ];

  const historyRows: Array<Array<string | number>> = [
    ['Date', 'Test Title', 'Score', 'Max Score', 'Accuracy %', 'Avg Sec/Q', 'Exam IQ'],
    ...params.attempts.map((a) => [
      (a.submittedAtIso || '').slice(0, 10),
      a.testTitle,
      a.score,
      a.maxScore,
      a.accuracyPercent,
      a.avgTimePerQuestion,
      a.iqScore,
    ]),
  ];

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'${summarySheetTitle}'!A1:D${summaryRows.length}`,
            values: summaryRows,
          },
          {
            range: `'${analyticsSheetTitle}'!A1:G${subjectRows.length}`,
            values: subjectRows,
          },
          {
            range: `'${historySheetTitle}'!A1:G${Math.max(2, historyRows.length)}`,
            values:
              historyRows.length > 1
                ? historyRows
                : [...historyRows, [dateStamp, 'No CBT mocks submitted yet', 0, 0, 0, 0, 0]],
          },
        ],
      }),
    }
  );

  if (!batchRes.ok) {
    const errText = await batchRes.text();
    throw new Error(`Spreadsheet created, but writing rows failed: ${errText.slice(0, 140)}`);
  }

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
    title,
  };
}

export interface PushTasksResult {
  taskListId: string;
  taskListTitle: string;
  createdCount: number;
}

/**
 * Fetches tasks from the user's "Prepskm Study Tasks" Google Tasks list (read-only).
 */
export async function fetchGoogleStudyTasks(): Promise<GoogleTaskListResult> {
  const token = await requireToken();
  const targetList = await findOrCreateStudyTaskList(token, false);
  if (!targetList) {
    return {
      taskListId: '',
      taskListTitle: DEFAULT_STUDY_TASK_LIST_TITLE,
      tasks: [],
    };
  }

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
      targetList.id
    )}/tasks?showCompleted=true&showHidden=false&maxResults=30`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (res.status === 401 || res.status === 403) {
    clearWorkspaceAccessToken();
    throw new Error('Google Tasks permission expired. Please reconnect with Google.');
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not load tasks (${res.status}): ${errText.slice(0, 140)}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      title?: string;
      notes?: string;
      due?: string;
      status?: string;
      updated?: string;
    }>;
  };

  const tasks: GoogleStudyTaskItem[] = (data.items ?? [])
    .filter((item) => Boolean(item.id && item.title))
    .map((item) => ({
      id: item.id,
      title: item.title || 'Untitled Study Task',
      notes: item.notes,
      due: item.due,
      status: item.status === 'completed' ? 'completed' : 'needsAction',
      updated: item.updated,
    }));

  return {
    taskListId: targetList.id,
    taskListTitle: targetList.title,
    tasks,
  };
}

/**
 * Creates a single custom study task in the user's "Prepskm Study Tasks" Google Tasks list.
 */
export async function createGoogleStudyTask(params: {
  title: string;
  notes?: string;
  dueDaysFromNow?: number;
}): Promise<{ taskListId: string; taskListTitle: string; task: GoogleStudyTaskItem }> {
  const token = await requireToken();
  const targetList = await findOrCreateStudyTaskList(token, true);
  if (!targetList) {
    throw new Error('Could not resolve Google Tasks list.');
  }

  const body: Record<string, string> = {
    title: params.title.trim(),
  };
  if (params.notes?.trim()) {
    body.notes = params.notes.trim();
  }
  if (params.dueDaysFromNow && params.dueDaysFromNow > 0) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + params.dueDaysFromNow);
    body.due = dueDate.toISOString();
  }

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList.id)}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 401 || res.status === 403) {
    clearWorkspaceAccessToken();
    throw new Error('Google Tasks permission expired. Please reconnect with Google.');
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not add task (${res.status}): ${errText.slice(0, 140)}`);
  }

  const created = (await res.json()) as {
    id: string;
    title: string;
    notes?: string;
    due?: string;
    status?: string;
  };

  return {
    taskListId: targetList.id,
    taskListTitle: targetList.title,
    task: {
      id: created.id,
      title: created.title,
      notes: created.notes,
      due: created.due,
      status: created.status === 'completed' ? 'completed' : 'needsAction',
    },
  };
}

/**
 * Toggles completion status of a study task in Google Tasks.
 */
export async function toggleGoogleStudyTaskStatus(params: {
  taskListId: string;
  taskId: string;
  completed: boolean;
}): Promise<GoogleStudyTaskItem> {
  const token = await requireToken();
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
      params.taskListId
    )}/tasks/${encodeURIComponent(params.taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: params.completed ? 'completed' : 'needsAction',
        ...(params.completed ? {} : { completed: null }),
      }),
    }
  );

  if (res.status === 401 || res.status === 403) {
    clearWorkspaceAccessToken();
    throw new Error('Google Tasks permission expired. Please reconnect with Google.');
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not update task status (${res.status}): ${errText.slice(0, 140)}`);
  }

  const updated = (await res.json()) as {
    id: string;
    title: string;
    notes?: string;
    due?: string;
    status?: string;
  };

  return {
    id: updated.id,
    title: updated.title,
    notes: updated.notes,
    due: updated.due,
    status: updated.status === 'completed' ? 'completed' : 'needsAction',
  };
}

/**
 * Deletes a study task from Google Tasks.
 */
export async function deleteGoogleStudyTask(params: {
  taskListId: string;
  taskId: string;
}): Promise<void> {
  const token = await requireToken();
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(
      params.taskListId
    )}/tasks/${encodeURIComponent(params.taskId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (res.status === 401 || res.status === 403) {
    clearWorkspaceAccessToken();
    throw new Error('Google Tasks permission expired. Please reconnect with Google.');
  }
  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Could not delete task (${res.status}): ${errText.slice(0, 140)}`);
  }
}

/**
 * Finds or creates a "Prepskm Study Tasks" Google Tasks list and pushes
 * the personalized chapter-level action items as actionable Google Tasks.
 */
export async function pushActionItemsToGoogleTasks(params: {
  actionItems: PrepScoreActionItem[];
  score: number;
  cohortLabel: string;
}): Promise<PushTasksResult> {
  const token = await requireToken();
  const targetList = await findOrCreateStudyTaskList(token, true);
  if (!targetList) {
    throw new Error('Could not resolve Google Tasks list.');
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  const dueIso = dueDate.toISOString();

  let createdCount = 0;
  for (const item of params.actionItems) {
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetList.id)}/tasks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[+${item.estimatedGainPts} pts] ${item.title}`,
          notes: `${params.cohortLabel} · Current Prep Score: ${params.score}/100\nChapter: ${item.chapterName} (${item.subjectName})\nWhy: ${item.reason}`,
          due: dueIso,
        }),
      }
    );
    if (res.ok) {
      createdCount++;
    }
  }

  return {
    taskListId: targetList.id,
    taskListTitle: targetList.title,
    createdCount,
  };
}

/**
 * Formats a clean Google Keep revision checklist note summarizing the student's
 * Prep Score (0-100), key insights, and top chapter targets for 85+.
 */
export function buildGoogleKeepRevisionNote(
  report: PrepScoreReport,
  cohortLabel: string
): string {
  const lines = [
    `Prepskm Prep Score — ${cohortLabel}`,
    `Score: ${report.score}/100 (${report.tier}) | Weekly: ${report.deltaThisWeek >= 0 ? '+' : ''}${report.deltaThisWeek} ${report.deltaLabel}`,
    '',
    'Key Score Drivers:',
    ...report.insights.map((i) => `- ${i.headline}`),
    '',
    'Action Plan to Reach 85+:',
    ...report.actionItems.map(
      (a) => `[ ] ${a.title} (+${a.estimatedGainPts} pts) — ${a.reason}`
    ),
  ];
  return lines.join('\n');
}
