import type { WeeklyDay, WeeklyScheduleItem } from '../types';

export const WEEK_DAYS: WeeklyDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WEEK_DAY_LABELS: Record<WeeklyDay, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export function createDefaultWeeklySchedule(): WeeklyScheduleItem[] {
  return [
    {
      id: 'ws-mon-1',
      day: 'Mon',
      timeSlot: '06:30 – 08:30',
      subject: 'Physics',
      topic: 'Electrostatics & Gauss Law — Concept + 20 PYQs',
      durationMinutes: 120,
      completed: false,
      priority: 'High',
    },
    {
      id: 'ws-mon-2',
      day: 'Mon',
      timeSlot: '17:00 – 18:30',
      subject: 'Chemistry',
      topic: 'NCERT Chemical Bonding & VSEPR Table Drill',
      durationMinutes: 90,
      completed: false,
      priority: 'Normal',
    },
    {
      id: 'ws-tue-1',
      day: 'Tue',
      timeSlot: '06:30 – 08:30',
      subject: 'Mathematics',
      topic: 'Definite Integration — King & Queen Properties',
      durationMinutes: 120,
      completed: false,
      priority: 'High',
    },
    {
      id: 'ws-tue-2',
      day: 'Tue',
      timeSlot: '18:00 – 19:15',
      subject: 'Physics',
      topic: 'Current Electricity Circuit Reductions DPP',
      durationMinutes: 75,
      completed: false,
      priority: 'Normal',
    },
    {
      id: 'ws-wed-1',
      day: 'Wed',
      timeSlot: '06:30 – 08:30',
      subject: 'Chemistry',
      topic: 'Chemical Kinetics Rate Orders + Half-Life Numericals',
      durationMinutes: 120,
      completed: false,
      priority: 'High',
    },
    {
      id: 'ws-wed-2',
      day: 'Wed',
      timeSlot: '17:30 – 19:00',
      subject: 'Biology',
      topic: 'NCERT Cell Cycle, Genetics & Active Recall Diagrams',
      durationMinutes: 90,
      completed: false,
      priority: 'Normal',
    },
    {
      id: 'ws-thu-1',
      day: 'Thu',
      timeSlot: '06:30 – 08:30',
      subject: 'Physics',
      topic: 'Rotational Motion Torque & Pure Rolling Problems',
      durationMinutes: 120,
      completed: false,
      priority: 'High',
    },
    {
      id: 'ws-thu-2',
      day: 'Thu',
      timeSlot: '18:00 – 19:30',
      subject: 'Mathematics',
      topic: 'Matrices, Determinants & Adjoint Properties',
      durationMinutes: 90,
      completed: false,
      priority: 'Normal',
    },
    {
      id: 'ws-fri-1',
      day: 'Fri',
      timeSlot: '06:30 – 08:30',
      subject: 'Chemistry',
      topic: 'Organic Reaction Mechanisms & Named Reactions Revision',
      durationMinutes: 120,
      completed: false,
      priority: 'High',
    },
    {
      id: 'ws-fri-2',
      day: 'Fri',
      timeSlot: '17:30 – 19:00',
      subject: 'Physics',
      topic: 'Optics & Modern Physics Formula Sheet Walkthrough',
      durationMinutes: 90,
      completed: false,
      priority: 'Normal',
    },
    {
      id: 'ws-sat-1',
      day: 'Sat',
      timeSlot: '09:00 – 12:00',
      subject: 'CBT Mock',
      topic: 'Full-Length Timed NTA CBT Mock Test (No Distractions)',
      durationMinutes: 180,
      completed: false,
      priority: 'High',
    },
    {
      id: 'ws-sun-1',
      day: 'Sun',
      timeSlot: '10:00 – 12:00',
      subject: 'Analysis',
      topic: 'Mistake Notebook Review + Weak Chapter Retest',
      durationMinutes: 120,
      completed: false,
      priority: 'High',
    },
  ];
}

export interface WeeklyScheduleStats {
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  plannedMinutes: number;
  completedMinutes: number;
  plannedHours: number;
  completedHours: number;
  byDayCounts: Record<WeeklyDay, { total: number; completed: number }>;
}

export function computeWeeklyScheduleStats(items: WeeklyScheduleItem[]): WeeklyScheduleStats {
  const byDayCounts = WEEK_DAYS.reduce(
    (acc, day) => {
      acc[day] = { total: 0, completed: 0 };
      return acc;
    },
    {} as Record<WeeklyDay, { total: number; completed: number }>
  );

  let completedTasks = 0;
  let plannedMinutes = 0;
  let completedMinutes = 0;

  for (const item of items) {
    const mins = Math.max(0, Number(item.durationMinutes) || 0);
    plannedMinutes += mins;
    if (byDayCounts[item.day]) {
      byDayCounts[item.day].total += 1;
    }
    if (item.completed) {
      completedTasks += 1;
      completedMinutes += mins;
      if (byDayCounts[item.day]) {
        byDayCounts[item.day].completed += 1;
      }
    }
  }

  const totalTasks = items.length;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    completionPercent,
    plannedMinutes,
    completedMinutes,
    plannedHours: Number((plannedMinutes / 60).toFixed(1)),
    completedHours: Number((completedMinutes / 60).toFixed(1)),
    byDayCounts,
  };
}

export function createSeoSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
