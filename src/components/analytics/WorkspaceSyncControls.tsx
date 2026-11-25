import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  StickyNote,
  X,
} from 'lucide-react';
import {
  buildGoogleKeepRevisionNote,
  connectGoogleWorkspace,
  exportPrepScoreToGoogleSheets,
  pushActionItemsToGoogleTasks,
  subscribeWorkspaceAuth,
} from '../../services/googleWorkspaceService';
import type { TestAttemptRecord } from '../../types';
import type { PrepScoreReport } from '../../utils/prepScoreEngine';
import { playClick, playSuccess } from '../../utils/soundEffects';

interface WorkspaceSyncControlsProps {
  report: PrepScoreReport;
  attempts: TestAttemptRecord[];
  cohortLabel: string;
  studentName: string;
  compact?: boolean;
}

type PendingWorkspaceAction = 'sheets' | 'tasks' | null;

export function WorkspaceSyncControls({
  report,
  attempts,
  cohortLabel,
  studentName,
  compact = false,
}: WorkspaceSyncControlsProps) {
  const [workspaceConnected, setWorkspaceConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingWorkspaceAction>(null);
  const [busyAction, setBusyAction] = useState<PendingWorkspaceAction>(null);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'success' | 'error' | 'info';
    text: string;
    linkUrl?: string;
    linkLabel?: string;
  } | null>(null);
  const [keepCopied, setKeepCopied] = useState(false);

  useEffect(() => {
    return subscribeWorkspaceAuth(setWorkspaceConnected);
  }, []);

  const handleConnectWorkspace = async () => {
    playClick();
    setConnecting(true);
    setStatusMessage(null);
    try {
      await connectGoogleWorkspace();
      playSuccess();
      setStatusMessage({
        kind: 'success',
        text: 'Google Workspace connected. You can now export to Google Sheets or push chapter goals to Google Tasks.',
      });
    } catch (err) {
      setStatusMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Google Workspace sign-in was cancelled or failed.',
      });
    } finally {
      setConnecting(false);
    }
  };

  const executeConfirmedAction = async () => {
    const action = pendingConfirm;
    if (!action) return;
    setPendingConfirm(null);
    setBusyAction(action);
    setStatusMessage(null);

    try {
      if (action === 'sheets') {
        const res = await exportPrepScoreToGoogleSheets({
          report,
          attempts,
          cohortLabel,
          studentName,
        });
        playSuccess();
        setStatusMessage({
          kind: 'success',
          text: `Created Google Sheet "${res.title}" with AI Prep Score and Mock History tabs.`,
          linkUrl: res.spreadsheetUrl,
          linkLabel: 'Open Google Sheet',
        });
      } else if (action === 'tasks') {
        const res = await pushActionItemsToGoogleTasks({
          actionItems: report.actionItems,
          score: report.score,
          cohortLabel,
        });
        playSuccess();
        setStatusMessage({
          kind: 'success',
          text: `Added ${res.createdCount} chapter action task${res.createdCount === 1 ? '' : 's'} to Google Tasks list "${res.taskListTitle}".`,
          linkUrl: 'https://tasks.google.com/',
          linkLabel: 'Open Google Tasks',
        });
      }
    } catch (err) {
      setStatusMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Google Workspace sync failed.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyForGoogleKeep = async () => {
    playClick();
    const noteText = buildGoogleKeepRevisionNote(report, cohortLabel);
    try {
      await navigator.clipboard.writeText(noteText);
      setKeepCopied(true);
      playSuccess();
      setStatusMessage({
        kind: 'info',
        text: 'Revision checklist copied for Google Keep. Paste directly into a new Keep note (direct Keep API requires enterprise Workspace domain delegation).',
        linkUrl: 'https://keep.google.com/',
        linkLabel: 'Open Google Keep',
      });
      window.setTimeout(() => setKeepCopied(false), 3000);
    } catch {
      setStatusMessage({
        kind: 'error',
        text: 'Clipboard access blocked. Open Google Keep directly to create your revision checklist.',
        linkUrl: 'https://keep.google.com/',
        linkLabel: 'Open Google Keep',
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? '' : 'pt-1'}`}>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-[#0B1B3B] dark:text-slate-200">
            Google Workspace Sync
          </span>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <span>
            {workspaceConnected
              ? 'Sheets & Tasks authorized in memory'
              : 'Export scorecards to Sheets, push 850+ tasks, or copy Keep checklists'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!workspaceConnected ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => void handleConnectWorkspace()}
              className="inline-flex items-center gap-2.5 h-10 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[#1F1F1F] dark:text-slate-100 text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              )}
              <span>Sign in with Google (Sheets &amp; Tasks)</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => {
                  playClick();
                  setPendingConfirm('sheets');
                }}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {busyAction === 'sheets' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                Export to Google Sheets
              </button>

              <button
                type="button"
                disabled={busyAction !== null || report.actionItems.length === 0}
                onClick={() => {
                  playClick();
                  setPendingConfirm('tasks');
                }}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {busyAction === 'tasks' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckSquare className="w-3.5 h-3.5" />
                )}
                Push to Google Tasks
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => void handleCopyForGoogleKeep()}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#F97316] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {keepCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{keepCopied ? 'Copied for Keep' : 'Copy for Google Keep'}</span>
            {!keepCopied && <Copy className="w-3 h-3 opacity-60" />}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs border ${
            statusMessage.kind === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : statusMessage.kind === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          {statusMessage.linkUrl && (
            <a
              href={statusMessage.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold underline shrink-0"
            >
              {statusMessage.linkLabel || 'Open'}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Mandatory Explicit Confirmation Modal before mutating Google Sheets or Google Tasks */}
      {pendingConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-confirm-title"
          className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F182D] border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h3
                  id="workspace-confirm-title"
                  className="font-display text-base font-bold text-[#0B1B3B] dark:text-white"
                >
                  {pendingConfirm === 'sheets'
                    ? 'Confirm Google Sheets Export'
                    : 'Confirm Google Tasks Creation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                aria-label="Cancel confirmation"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingConfirm === 'sheets' ? (
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                <p>
                  This will create a new spreadsheet in your Google Drive titled{' '}
                  <strong className="text-[#0B1B3B] dark:text-white">
                    Prepskm AI Prep Score ({cohortLabel})
                  </strong>{' '}
                  and write:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <li>AI Prep Score ({report.score}/1000) and 4-factor diagnostic breakdown</li>
                  <li>3 AI score movement insights and {report.actionItems.length} chapter action items</li>
                  <li>{attempts.length} mock test history row{attempts.length === 1 ? '' : 's'}</li>
                </ul>
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                <p>
                  This will add{' '}
                  <strong className="text-[#0B1B3B] dark:text-white">
                    {report.actionItems.length} task{report.actionItems.length === 1 ? '' : 's'}
                  </strong>{' '}
                  to your Google Tasks list{' '}
                  <strong className="text-[#0B1B3B] dark:text-white">
                    Prepskm 850+ Prep Plan
                  </strong>
                  :
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  {report.actionItems.map((item) => (
                    <li key={item.id}>
                      {item.title} (+{item.estimatedGainPts} pts)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeConfirmedAction()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B1B3B] dark:bg-[#2563EB] text-white hover:opacity-95 transition-opacity"
              >
                {pendingConfirm === 'sheets' ? 'Confirm & Create Sheet' : 'Confirm & Create Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
