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
    shortDescription: 'Chapter-wise short notes, formula sheets, mind maps & PYQs',
    showInPublicNav: true,
  },
  {
    path: '/analytics',
    label: 'Test Analysis',
    shortDescription: 'Pro-level scorecards, percentile, attempt & difficulty breakdown',
    showInPublicNav: true,
  },
  {
    path: '/mistakes',
    label: 'Mistake Notebook',
    shortDescription: 'Auto-saved wrong/unattempted questions & bookmarked vault',
    showInPublicNav: true,
  },
  {
    path: '/preps-ai',
    label: 'Preps AI',
    shortDescription: 'Voice & chat AI mentor grounded in your real mock scores',
    showInPublicNav: true,
  },
];

export const SECONDARY_SIDEBAR_ROUTES: NavRouteItem[] = [
  {
    path: '/dpp',
    label: 'Chapter DPPs',
    shortDescription: 'Timed chapter-wise Daily Practice Problems',
    showInPublicNav: true,
  },
  {
    path: '/profile',
    label: 'Profile & Track',
    shortDescription: 'Student profile, avatar, target exam & preferences',
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
