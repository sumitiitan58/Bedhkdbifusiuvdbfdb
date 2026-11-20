import { useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { usePlatformData } from '../context/PlatformDataContext';
import type { StudentCohortId } from '../types';
import { playClick } from '../utils/soundEffects';

interface ClassSubClassPickerProps {
  selectedCohortId: StudentCohortId;
  onSelect: (cohortId: StudentCohortId) => void;
  compact?: boolean;
}

export function ClassSubClassPicker({
  selectedCohortId,
  onSelect,
  compact = false,
}: ClassSubClassPickerProps) {
  const { classGroups } = usePlatformData();

  const findGroupForCohort = (cid: string) =>
    classGroups.find((g) => g.subClasses.some((s) => s.id === cid)) ?? classGroups[0];

  const [activeGroupId, setActiveGroupId] = useState<string>(
    () => findGroupForCohort(selectedCohortId)?.id ?? classGroups[0]?.id ?? ''
  );

  useEffect(() => {
    const matched = findGroupForCohort(selectedCohortId);
    if (matched && matched.id !== activeGroupId) {
      setActiveGroupId(matched.id);
    }
  }, [selectedCohortId, classGroups]);

  const activeGroup =
    classGroups.find((g) => g.id === activeGroupId) ?? classGroups[0];

  return (
    <div className="space-y-2.5">
      {/* Step 1: Compact Class Tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select class level">
        {classGroups.map((group) => {
          const isCurrentGroup = group.id === activeGroup?.id;
          const hasSelectedChild = group.subClasses.some((s) => s.id === selectedCohortId);
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={isCurrentGroup}
              onClick={() => {
                playClick();
                setActiveGroupId(group.id);
                if (group.subClasses.length === 1) {
                  onSelect(group.subClasses[0].id);
                }
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                isCurrentGroup
                  ? 'bg-[#0B1B3B] dark:bg-[#2563EB] text-white border-[#0B1B3B] dark:border-[#2563EB]'
                  : hasSelectedChild
                    ? 'bg-orange-50 dark:bg-orange-950/30 text-[#0B1B3B] dark:text-white border-[#F97316]'
                    : 'bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#2563EB] dark:hover:border-sky-400'
              }`}
            >
              <span>{group.name}</span>
              {group.subClasses.length > 1 && (
                <span className="ml-1 text-[10px] opacity-75">({group.subClasses.length})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Step 2: Compact 2-Column Mobile / 3-Column Desktop Sub-Classes */}
      {activeGroup && (
        <div
          className={`grid gap-2 ${
            compact
              ? 'grid-cols-2 sm:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {activeGroup.subClasses.map((sub) => {
            const isSelected = sub.id === selectedCohortId;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  playClick();
                  onSelect(sub.id);
                }}
                aria-pressed={isSelected}
                className={`group text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-150 ${
                  isSelected
                    ? 'border-[#F97316] bg-orange-50/80 dark:bg-[#F97316]/12 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-[#2563EB] dark:hover:border-sky-400'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-display text-xs sm:text-sm font-bold text-[#0B1B3B] dark:text-white leading-tight truncate">
                    {sub.shortLabel || sub.label}
                  </span>
                  {isSelected ? (
                    <span className="h-4 w-4 rounded-full bg-[#F97316] text-white inline-flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] transition-transform group-hover:translate-x-0.5 shrink-0" />
                  )}
                </div>
                <p className="mt-1 text-[11px] font-medium text-[#2563EB] dark:text-sky-400 truncate">
                  {sub.stream} · {sub.subjects.slice(0, 3).join(', ')}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
