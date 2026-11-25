import type { NavRouteItem, RoutePath, StudentCohort, StudentCohortId } from '../types';
import { STUDENT_COHORTS } from '../services/platformRegistry';

export const PUBLIC_NAV_ROUTES: NavRouteItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    shortDescription: 'Study overview, daily streak, exam countdown & quick actions',
    showInPublicNav: true,
  },
  {
    path: '/cbt-mocks',
    label: 'All Tests (CBT)',
    shortDescription: 'NTA-style JEE & NEET computer-based mock tests',
    showInPublicNav: true,
  },
  {
    path: '/materials',
    label: 'Study Materials',
    shortDescription: 'Chapter notes, formula sheets, PYQs & inline Chapter DPPs',
    showInPublicNav: true,
  },
  {
    path: '/analytics',
    label: 'Test Analysis',
    shortDescription: 'Prep Score (0–100), percentile, pacing & Google Sheets sync',
    showInPublicNav: true,
  },
  {
    path: '/mistakes',
    label: 'Mistake Notebook',
    shortDescription: 'AI error pattern diagnosis, personalized re-attempt sets & vault',
    showInPublicNav: true,
  },
  {
    path: '/preps-ai',
    label: 'Preps AI',
    shortDescription: 'Compact voice & chat AI mentor synced with your live context',
    showInPublicNav: true,
  },
];

export const SECONDARY_SIDEBAR_ROUTES: NavRouteItem[] = [
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
  { path: '/cbt-mocks', label: 'Tests' },
  { path: '/materials', label: 'Notes' },
  { path: '/analytics', label: 'Analysis' },
  { path: '/mistakes', label: 'Mistakes' },
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
