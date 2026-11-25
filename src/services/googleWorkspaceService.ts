import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { auth } from '../firebase/config';
import type { TestAttemptRecord } from '../types';
import type { PrepScoreActionItem, PrepScoreReport } from '../utils/prepScoreEngine';

/**
 * Provisioned Google Workspace OAuth scopes for Prepskm (Google Sheets, Drive & Google Tasks).
 * Note: Google Keep API is enterprise domain-wide-delegation only and cannot be authorized
 * via standard consumer @gmail.com OAuth consent popups; Keep export is supported via
 * structured checklist copy + deep link.
 */
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
] as const;

const workspaceProvider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  workspaceProvider.addScope(scope);
}
workspaceProvider.setCustomParameters({ prompt: 'consent select_account' });

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

export function clearWorkspaceAccessToken(): void {
  cachedWorkspaceToken = null;
  notifyListeners();
}

export async function connectGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isConnectingWorkspace = true;
    const result = await signInWithPopup(auth, workspaceProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain a Google Workspace access token. Please allow Sheets and Tasks permissions.');
    }
    cachedWorkspaceToken = credential.accessToken;
    notifyListeners();
    return { user: result.user, accessToken: cachedWorkspaceToken };
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

/**
 * Creates a formatted Google Spreadsheet with two sheets:
 * 1) "AI Prep Score" — current readiness score, 4-factor breakdown, and chapter action plan
 * 2) "Mock History" — test-by-test score, accuracy, and timing log
 */
export async function exportPrepScoreToGoogleSheets(params: {
  report: PrepScoreReport;
  attempts: TestAttemptRecord[];
  cohortLabel: string;
  studentName: string;
}): Promise<ExportSheetResult> {
  const token = await requireToken();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const title = `Prepskm AI Prep Score (${params.cohortLabel}) - ${dateStamp}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'AI Prep Score' } },
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

  const summarySheetTitle = created.sheets?.[0]?.properties?.title || 'AI Prep Score';
  const historySheetTitle = created.sheets?.[1]?.properties?.title || 'Mock History';

  const summaryRows: Array<Array<string | number>> = [
    ['PREPSKM.IN — AI Prep Score Report', '', '', ''],
    ['Student', params.studentName, 'Track', params.cohortLabel],
    ['Generated On', dateStamp, 'Readiness Tier', params.report.tier],
    ['AI Prep Score', `${params.report.score} / 1000`, 'Weekly Delta', `${params.report.deltaThisWeek >= 0 ? '+' : ''}${params.report.deltaThisWeek} (${params.report.deltaLabel})`],
    ['Points to 850+ Target', params.report.pointsTo850, 'Active Streak', `${params.report.diagnostics.activeStreakDays} days`],
    ['', '', '', ''],
    ['4-Factor Breakdown', 'Earned', 'Max', 'Weight & Diagnostic'],
    ...params.report.factors.map((f) => [
      f.label,
      f.score,
      f.maxScore,
      `${f.weightPercent}% — ${f.summary}`,
    ]),
    ['', '', '', ''],
    ['Key AI Insights', 'Impact (pts)', 'Summary', ''],
    ...params.report.insights.map((ins) => [
      ins.headline,
      ins.deltaPts,
      ins.detail,
      '',
    ]),
    ['', '', '', ''],
    ['Chapter Action Items (850+ Roadmap)', 'Subject', 'Est. Gain (pts)', 'Focus Guidance'],
    ...params.report.actionItems.map((act) => [
      act.title,
      act.subjectName,
      `+${act.estimatedGainPts}`,
      act.reason,
    ]),
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
  taskListTitle: string;
  createdCount: number;
}

/**
 * Finds or creates a "Prepskm 850+ Prep Plan" Google Tasks list and pushes
 * the personalized chapter-level action items as actionable Google Tasks.
 */
export async function pushActionItemsToGoogleTasks(params: {
  actionItems: PrepScoreActionItem[];
  score: number;
  cohortLabel: string;
}): Promise<PushTasksResult> {
  const token = await requireToken();
  const listTitle = 'Prepskm 850+ Prep Plan';

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

  let targetList = listsData.items?.find(
    (l) => l.title.trim().toLowerCase() === listTitle.toLowerCase()
  );

  if (!targetList) {
    const createListRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: listTitle }),
    });
    if (!createListRes.ok) {
      throw new Error('Failed to create the Prepskm task list in Google Tasks.');
    }
    targetList = (await createListRes.json()) as { id: string; title: string };
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
          notes: `${params.cohortLabel} · Current AI Prep Score: ${params.score}/1000\nChapter: ${item.chapterName} (${item.subjectName})\nWhy: ${item.reason}`,
          due: dueIso,
        }),
      }
    );
    if (res.ok) {
      createdCount++;
    }
  }

  return {
    taskListTitle: targetList.title,
    createdCount,
  };
}

/**
 * Formats a clean Google Keep revision checklist note summarizing the student's
 * AI Prep Score, key insights, and top chapter targets for 850+.
 */
export function buildGoogleKeepRevisionNote(
  report: PrepScoreReport,
  cohortLabel: string
): string {
  const lines = [
    `Prepskm AI Prep Score — ${cohortLabel}`,
    `Score: ${report.score}/1000 (${report.tier}) | Weekly: ${report.deltaThisWeek >= 0 ? '+' : ''}${report.deltaThisWeek} ${report.deltaLabel}`,
    '',
    'Key Score Drivers:',
    ...report.insights.map((i) => `- ${i.headline}`),
    '',
    'Action Plan to Reach 850+:',
    ...report.actionItems.map(
      (a) => `[ ] ${a.title} (+${a.estimatedGainPts} pts) — ${a.reason}`
    ),
  ];
  return lines.join('\n');
}
