import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  ListTodo,
  Loader2,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildGoogleKeepRevisionNote,
  connectGoogleWorkspace,
  createGoogleStudyTask,
  deleteGoogleStudyTask,
  exportPrepScoreToGoogleSheets,
  fetchGoogleStudyTasks,
  pushActionItemsToGoogleTasks,
  subscribeWorkspaceAuth,
  toggleGoogleStudyTaskStatus,
  type GoogleStudyTaskItem,
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

type PendingWorkspaceAction =
  | { type: 'sheets' }
  | { type: 'push-tasks' }
  | { type: 'add-task'; title: string; notes: string }
  | { type: 'toggle-task'; task: GoogleStudyTaskItem; nextCompleted: boolean }
  | { type: 'delete-task'; task: GoogleStudyTaskItem }
  | null;

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
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'success' | 'error' | 'info';
    text: string;
    linkUrl?: string;
    linkLabel?: string;
  } | null>(null);
  const [keepCopied, setKeepCopied] = useState(false);

  // Google Tasks Study Manager drawer state
  const [tasksOpen, setTasksOpen] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskListId, setTaskListId] = useState('');
  const [taskListTitle, setTaskListTitle] = useState('Prepskm Study Tasks');
  const [tasks, setTasks] = useState<GoogleStudyTaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  useEffect(() => {
    return subscribeWorkspaceAuth(setWorkspaceConnected);
  }, []);

  const loadStudyTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const result = await fetchGoogleStudyTasks();
      setTaskListId(result.taskListId);
      setTaskListTitle(result.taskListTitle);
      setTasks(result.tasks);
    } catch (err) {
      setStatusMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to load Google Tasks.',
      });
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (workspaceConnected && tasksOpen) {
      void loadStudyTasks();
    }
  }, [workspaceConnected, tasksOpen, loadStudyTasks]);

  const handleConnectWorkspace = async () => {
    playClick();
    setConnecting(true);
    setStatusMessage(null);
    try {
      await connectGoogleWorkspace();
      playSuccess();
      setStatusMessage({
        kind: 'success',
        text: 'Google Workspace connected. Export 3-tab test analytics to Sheets or manage study goals in Google Tasks.',
      });
    } catch (err) {
      setStatusMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Google Workspace sign-in was cancelled or failed.',
      });
    } finally {
      setConnecting(false);
    }
  };

  const executeConfirmedAction = async () => {
    const action = pendingConfirm;
    if (!action) return;
    setPendingConfirm(null);
    setBusyAction(action.type);
    setStatusMessage(null);

    try {
      if (action.type === 'sheets') {
        const res = await exportPrepScoreToGoogleSheets({
          report,
          attempts,
          cohortLabel,
          studentName,
        });
        playSuccess();
        setStatusMessage({
          kind: 'success',
          text: `Created Google Sheet "${res.title}" with Prep Score (0–100), Subject & Chapter Analytics, and Mock History tabs.`,
          linkUrl: res.spreadsheetUrl,
          linkLabel: 'Open Google Sheet',
        });
      } else if (action.type === 'push-tasks') {
        const res = await pushActionItemsToGoogleTasks({
          actionItems: report.actionItems,
          score: report.score,
          cohortLabel,
        });
        playSuccess();
        setTaskListId(res.taskListId);
        setTaskListTitle(res.taskListTitle);
        setStatusMessage({
          kind: 'success',
          text: `Added ${res.createdCount} chapter action task${res.createdCount === 1 ? '' : 's'} to Google Tasks list "${res.taskListTitle}".`,
          linkUrl: 'https://tasks.google.com/',
          linkLabel: 'Open Google Tasks',
        });
        if (tasksOpen) {
          await loadStudyTasks();
        }
      } else if (action.type === 'add-task') {
        const created = await createGoogleStudyTask({
          title: action.title,
          notes: action.notes || `${cohortLabel} · Prep Score ${report.score}/100`,
          dueDaysFromNow: 2,
        });
        playSuccess();
        setTaskListId(created.taskListId);
        setTaskListTitle(created.taskListTitle);
        setTasks((prev) => [created.task, ...prev]);
        setNewTaskTitle('');
        setNewTaskNotes('');
        setStatusMessage({
          kind: 'success',
          text: `Added "${created.task.title}" to Google Tasks.`,
        });
      } else if (action.type === 'toggle-task') {
        if (!taskListId) return;
        const updated = await toggleGoogleStudyTaskStatus({
          taskListId,
          taskId: action.task.id,
          completed: action.nextCompleted,
        });
        playSuccess();
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setStatusMessage({
          kind: 'success',
          text: action.nextCompleted
            ? `Marked "${updated.title}" completed in Google Tasks.`
            : `Reopened "${updated.title}" in Google Tasks.`,
        });
      } else if (action.type === 'delete-task') {
        if (!taskListId) return;
        await deleteGoogleStudyTask({
          taskListId,
          taskId: action.task.id,
        });
        playSuccess();
        setTasks((prev) => prev.filter((t) => t.id !== action.task.id));
        setStatusMessage({
          kind: 'info',
          text: `Removed "${action.task.title}" from Google Tasks.`,
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
        text: 'Revision checklist copied for Google Keep. Paste directly into a new Keep note.',
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

  const pendingTaskCount = tasks.filter((t) => t.status !== 'completed').length;

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
              ? 'Google Sheets & Google Tasks ready in memory'
              : 'Export 3-tab Sheets analytics & manage study goals in Google Tasks'}
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
              <span>Connect Google Sheets &amp; Tasks</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => {
                  playClick();
                  setPendingConfirm({ type: 'sheets' });
                }}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {busyAction === 'sheets' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                Export Analytics Sheet
              </button>

              <button
                type="button"
                disabled={busyAction !== null || report.actionItems.length === 0}
                onClick={() => {
                  playClick();
                  setPendingConfirm({ type: 'push-tasks' });
                }}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {busyAction === 'push-tasks' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckSquare className="w-3.5 h-3.5" />
                )}
                Push Plan to Tasks
              </button>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  setTasksOpen((prev) => !prev);
                }}
                aria-expanded={tasksOpen}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0B1B3B] dark:text-slate-100 hover:border-[#2563EB] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <ListTodo className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Study Tasks{tasks.length > 0 ? ` (${pendingTaskCount})` : ''}</span>
                {tasksOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 opacity-70" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                )}
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
            <span>{keepCopied ? 'Copied for Keep' : 'Copy Keep Checklist'}</span>
            {!keepCopied && <Copy className="w-3 h-3 opacity-60" />}
          </button>
        </div>
      </div>

      {/* Inline Google Tasks Study Manager Panel (when connected & expanded) */}
      {workspaceConnected && tasksOpen && (
        <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-xs font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-[#2563EB]" />
                Google Tasks · {taskListTitle}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Add, complete, or remove study goals synced directly with your Google Tasks account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadStudyTasks()}
              disabled={tasksLoading}
              aria-label="Refresh Google Study Tasks"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tasksLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Add Study Task Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const title = newTaskTitle.trim();
              if (!title) return;
              playClick();
              setPendingConfirm({
                type: 'add-task',
                title,
                notes: newTaskNotes.trim(),
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New study task (e.g., Solve 25 Electrostatics PYQs)..."
              aria-label="New Google study task title"
              className="sm:col-span-6 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <input
              type="text"
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
              placeholder="Optional note or chapter target"
              aria-label="Optional task note"
              className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim() || busyAction !== null}
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[#0B1B3B] dark:bg-[#2563EB] text-white text-xs font-semibold hover:opacity-95 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </form>

          {/* Task Items List */}
          {tasksLoading ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
              Loading your Google Study Tasks...
            </div>
          ) : tasks.length === 0 ? (
            <p className="py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
              No tasks in &ldquo;{taskListTitle}&rdquo; yet. Add a custom task above or click{' '}
              <strong>Push Plan to Tasks</strong> to sync your 85+ action items.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200/70 dark:divide-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950/60 overflow-hidden">
              {tasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <li
                    key={task.id}
                    className="px-3 py-2.5 flex items-start justify-between gap-3 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setPendingConfirm({
                          type: 'toggle-task',
                          task,
                          nextCompleted: !isDone,
                        });
                      }}
                      className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded border inline-flex items-center justify-center shrink-0 transition-colors ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isDone && <Check className="w-3 h-3" />}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block font-semibold ${
                            isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-[#0B1B3B] dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.notes && (
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {task.notes}
                          </span>
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setPendingConfirm({ type: 'delete-task', task });
                      }}
                      aria-label={`Delete task "${task.title}"`}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

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

      {/* Mandatory Explicit Confirmation Modal before EVERY Google Sheets or Google Tasks write/update/delete */}
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
                  {pendingConfirm.type === 'sheets'
                    ? 'Confirm Google Sheets Export'
                    : pendingConfirm.type === 'push-tasks'
                      ? 'Confirm Google Tasks Sync'
                      : pendingConfirm.type === 'add-task'
                        ? 'Confirm New Google Task'
                        : pendingConfirm.type === 'toggle-task'
                          ? 'Confirm Task Status Update'
                          : 'Confirm Delete Google Task'}
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

            {pendingConfirm.type === 'sheets' && (
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                <p>
                  This will create a new 3-tab spreadsheet in your Google Drive titled{' '}
                  <strong className="text-[#0B1B3B] dark:text-white">
                    Prepskm Test Analytics &amp; Prep Score ({cohortLabel})
                  </strong>{' '}
                  containing:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Prep Score ({report.score}/100) and 4-factor diagnostic breakdown</li>
                  <li>Subject &amp; Chapter accuracy analytics across your tests</li>
                  <li>{attempts.length} mock test history row{attempts.length === 1 ? '' : 's'}</li>
                </ul>
              </div>
            )}

            {pendingConfirm.type === 'push-tasks' && (
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                <p>
                  This will add{' '}
                  <strong className="text-[#0B1B3B] dark:text-white">
                    {report.actionItems.length} task{report.actionItems.length === 1 ? '' : 's'}
                  </strong>{' '}
                  to your Google Tasks list{' '}
                  <strong className="text-[#0B1B3B] dark:text-white">{taskListTitle}</strong>:
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

            {pendingConfirm.type === 'add-task' && (
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                <p>
                  Add this study task to your Google Tasks list{' '}
                  <strong className="text-[#0B1B3B] dark:text-white">{taskListTitle}</strong>?
                </p>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-[#0B1B3B] dark:text-white">
                  {pendingConfirm.title}
                </p>
              </div>
            )}

            {pendingConfirm.type === 'toggle-task' && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Mark{' '}
                <strong className="text-[#0B1B3B] dark:text-white">
                  &ldquo;{pendingConfirm.task.title}&rdquo;
                </strong>{' '}
                as {pendingConfirm.nextCompleted ? 'completed' : 'incomplete'} in Google Tasks?
              </p>
            )}

            {pendingConfirm.type === 'delete-task' && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Permanently remove{' '}
                <strong className="text-[#0B1B3B] dark:text-white">
                  &ldquo;{pendingConfirm.task.title}&rdquo;
                </strong>{' '}
                from your Google Tasks list?
              </p>
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
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-95 transition-opacity ${
                  pendingConfirm.type === 'delete-task'
                    ? 'bg-rose-600'
                    : 'bg-[#0B1B3B] dark:bg-[#2563EB]'
                }`}
              >
                {pendingConfirm.type === 'sheets'
                  ? 'Confirm & Create Sheet'
                  : pendingConfirm.type === 'push-tasks'
                    ? 'Confirm & Sync Tasks'
                    : pendingConfirm.type === 'add-task'
                      ? 'Confirm & Add Task'
                      : pendingConfirm.type === 'toggle-task'
                        ? 'Confirm Update'
                        : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
