import type { NavRouteItem, RoutePath, StudentCohort, StudentCohortId } from '../types';
import { STUDENT_COHORTS } from '../services/platformRegistry';

export const PUBLIC_NAV_ROUTES: NavRouteItem[] = [
  {
    path: '/',
    label: 'Home',
    shortDescription: 'Weekly schedule, 60-day planner & cohorts',
    showInPublicNav: true,
  },
  {
    path: '/materials',
    label: 'Materials',
    shortDescription: 'Chapter notes, formula sheets, PYQs & videos',
    showInPublicNav: true,
  },
  {
    path: '/cbt-mocks',
    label: 'CBT Mocks',
    shortDescription: 'NTA-style JEE & NEET computer-based tests',
    showInPublicNav: true,
  },
  {
    path: '/dpp',
    label: 'DPP',
    shortDescription: 'Chapter-wise Daily Practice Problems',
    showInPublicNav: true,
  },
  {
    path: '/analytics',
    label: 'Analytics',
    shortDescription: 'Performance graphs, past solutions & Gemini AI IQ',
    showInPublicNav: true,
  },
  {
    path: '/admin',
    label: 'Admin',
    shortDescription: 'Protected faculty & administrator content console',
    showInPublicNav: true,
  },
];

export const MOBILE_BOTTOM_TABS: { path: RoutePath; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/materials', label: 'Materials' },
  { path: '/cbt-mocks', label: 'CBT' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/profile', label: 'Profile' },
];

export const ALL_APP_ROUTES: NavRouteItem[] = [
  ...PUBLIC_NAV_ROUTES,
  {
    path: '/profile',
    label: 'Profile',
    shortDescription: 'Student profile, avatar, target exam & preferences',
    showInPublicNav: false,
  },
  {
    path: '/about',
    label: 'About',
    shortDescription: 'About PREPSKM.IN, @unfiltereddsumit, SEO & FAQs',
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
