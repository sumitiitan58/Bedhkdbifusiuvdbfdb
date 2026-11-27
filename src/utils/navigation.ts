import type { NavRouteItem, RoutePath, StudentCohort, StudentCohortId } from '../types';
import { STUDENT_COHORTS } from '../services/platformRegistry';

export const PUBLIC_NAV_ROUTES: NavRouteItem[] = [
  {
    path: '/',
    label: 'Home',
    shortDescription: 'Adaptive Bento OS, Formula Check, Percentile Predictor & Chapter Mastery',
    showInPublicNav: true,
  },
  {
    path: '/arena',
    label: 'Apex Arena',
    shortDescription: 'Quantum Clash, Synthesis Strike, Logic Labyrinth & 1v1 vs AI Point-Trading Duels',
    showInPublicNav: true,
  },
  {
    path: '/cbt-mocks',
    label: 'CBT Mocks',
    shortDescription: 'Custom Mock Builder (10/25/45Q + AI Balanced), NTA CBT Simulator & Tilt Diagnostics',
    showInPublicNav: true,
  },
  {
    path: '/materials',
    label: 'AI & Notes',
    shortDescription: 'Chapter notes, formula sheets, PYQs, inline DPPs & AI study resources',
    showInPublicNav: true,
  },
  {
    path: '/mentors',
    label: 'Mentors',
    shortDescription: 'Verified IIT/AIIMS 1:1 passes, live audio/video room, forum & peer finder',
    showInPublicNav: true,
  },
];

export const SECONDARY_SIDEBAR_ROUTES: NavRouteItem[] = [
  {
    path: '/dpp',
    label: 'Chapter DPPs',
    shortDescription: 'Instant Generate DPP studio & chapter-wise daily practice problem sets',
    showInPublicNav: false,
  },
  {
    path: '/preps-ai',
    label: 'Preps AI Chat',
    shortDescription: 'Full-screen Gemini AI study mentor synced with live exam context',
    showInPublicNav: false,
  },
  {
    path: '/analytics',
    label: 'Test Analysis',
    shortDescription: 'Prep Score (0–100), percentile, pacing & Google Sheets sync',
    showInPublicNav: false,
  },
  {
    path: '/mistakes',
    label: 'Mistake Notebook',
    shortDescription: 'AI error pattern diagnosis, SM-2 re-attempt sets & vault',
    showInPublicNav: false,
  },
  {
    path: '/profile',
    label: 'Profile & Track',
    shortDescription: 'Student profile, avatar, active class track & preferences',
    showInPublicNav: false,
  },
  {
    path: '/about',
    label: 'About Prepskm',
    shortDescription: 'About PREPSKM.IN, @unfiltereddsumit & FAQs',
    showInPublicNav: false,
  },
];

export const MOBILE_BOTTOM_TABS: { path: RoutePath; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/arena', label: 'Arena' },
  { path: '/cbt-mocks', label: 'CBT' },
  { path: '/materials', label: 'Notes' },
  { path: '/mentors', label: 'Mentors' },
];

export const ALL_APP_ROUTES: NavRouteItem[] = [
  ...PUBLIC_NAV_ROUTES,
  ...SECONDARY_SIDEBAR_ROUTES,
  {
    path: '/admin',
    label: 'Admin',
    shortDescription: 'Protected faculty & administrator content console',
    showInPublicNav: false,
  },
];

export function isRouteActive(currentPathname: string, targetPath: RoutePath): boolean {
  const normalizedCurrent = currentPathname.replace(/\/+$/, '') || '/';
  const normalizedTarget = targetPath.replace(/\/+$/, '') || '/';
  if (normalizedTarget === '/') {
    return normalizedCurrent === '/';
  }
  return (
    normalizedCurrent === normalizedTarget ||
    normalizedCurrent.startsWith(`${normalizedTarget}/`)
  );
}

export function getCohortById(
  id: StudentCohortId,
  cohortsList: StudentCohort[] = STUDENT_COHORTS
): StudentCohort {
  return cohortsList.find((c) => c.id === id) ?? cohortsList[0] ?? STUDENT_COHORTS[0];
}

export function filterCohortsByStream(
  stream: string,
  cohortsList: StudentCohort[] = STUDENT_COHORTS
): StudentCohort[] {
  if (stream === 'All') return cohortsList;
  return cohortsList.filter((c) => c.stream === stream);
}
