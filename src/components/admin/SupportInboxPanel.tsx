import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Inbox, Trash2 } from 'lucide-react';
import { ReusableCard } from '../ReusableCard';
import {
  BLUEPRINT_SYNC_EVENT,
  deleteSupportRequest,
  loadSupportRequests,
  updateSupportRequestStatus,
} from '../../services/blueprintStore';
import type {
  AdminSupportRequest,
  SupportRequestStatus,
} from '../../utils/chatHistoryLogic';
import { playClick } from '../../utils/soundEffects';

export function SupportInboxPanel() {
  const [requests, setRequests] = useState<AdminSupportRequest[]>(() => loadSupportRequests());
  const [statusFilter, setStatusFilter] = useState<'All' | SupportRequestStatus>('All');

  useEffect(() => {
    const sync = () => setRequests(loadSupportRequests());
    window.addEventListener(BLUEPRINT_SYNC_EVENT, sync);
    return () => window.removeEventListener(BLUEPRINT_SYNC_EVENT, sync);
  }, []);

  const filtered =
    statusFilter === 'All'
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  const openCount = requests.filter((r) => r.status === 'Open').length;

  return (
    <ReusableCard>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-600" />
            Chat Support &amp; Feature Request Inbox
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Live queue of student missing chapter alerts, formula sheet requests, bug reports, and Apex Arena suggestions submitted from Preps AI Chat.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {(['All', 'Open', 'In Review', 'Resolved'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab}
              {tab === 'Open' ? ` (${openCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">
          No requests in this status filter.
        </div>
      ) : (
        <div data-testid="admin-support-inbox-list" className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    {req.category}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {req.examTrack} · {req.subject}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 tabular-nums">
                    {new Date(req.createdAtIso).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {req.summary}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {req.details}
                </p>
                <p className="text-[11px] text-slate-500">
                  From: {req.studentName} ({req.studentEmail})
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <select
                  value={req.status}
                  onChange={(e) => {
                    playClick();
                    setRequests(
                      updateSupportRequestStatus(
                        req.id,
                        e.target.value as SupportRequestStatus
                      )
                    );
                  }}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="Open">Open</option>
                  <option value="In Review">In Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    {req.status === 'Resolved' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {req.status}
                  </span>
                  <button
                    type="button"
                    aria-label="Delete request"
                    onClick={() => {
                      playClick();
                      setRequests(deleteSupportRequest(req.id));
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ReusableCard>
  );
}
