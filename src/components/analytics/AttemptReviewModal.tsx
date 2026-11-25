import { X } from 'lucide-react';
import type { TestAttemptRecord, TestQuestionRecord } from '../../types';
import { playClick } from '../../utils/soundEffects';
import { ProTestAnalysisDashboard } from './ProTestAnalysisDashboard';

interface AttemptReviewModalProps {
  attempt: TestAttemptRecord;
  questions: TestQuestionRecord[];
  onClose: () => void;
}

export function AttemptReviewModal({ attempt, questions, onClose }: AttemptReviewModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Analysis and solutions for ${attempt.testTitle}`}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
    >
      <div className="w-full max-w-[1380px] max-h-[94vh] bg-[#F8FAFC] dark:bg-[#090E1A] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-[#0E1629]">
          <p className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white truncate">
            Full Test Analysis — {attempt.testTitle}
          </p>
          <button
            type="button"
            aria-label="Close analysis modal"
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <ProTestAnalysisDashboard attempt={attempt} questions={questions} />
        </div>
      </div>
    </div>
  );
}
