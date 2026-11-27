import type { NavRouteItem, RoutePath, StudentCohort, StudentCohortId } from '../types';
import { STUDENT_COHORTS } from '../services/platformRegistry';

export const PUBLIC_NAV_ROUTES: NavRouteItem[] = [
  {
    path: '/',
    label: 'Home',
    shortDescription: 'Focused Dashboard, Study Materials, Chapter DPPs & CBT Mock Quick Launch',
    showInPublicNav: true,
  },
  {
    path: '/materials',
    label: 'Materials & Notes',
    shortDescription: 'Curated Study Materials, Formula Sheets, Syllabus Notes & Google Keep Sync',
    showInPublicNav: true,
  },
  {
    path: '/dpp',
    label: 'Chapter DPPs',
    shortDescription: 'Chapter-Wise Daily Practice Problems with Interactive Quiz Mode & Solutions',
    showInPublicNav: true,
  },
  {
    path: '/cbt-mocks',
    label: 'CBT Mocks',
    shortDescription: 'NTA CBT Mock Tests & Dedicated Custom Mock Builder with Strict Chapter Matching',
    showInPublicNav: true,
  },
  {
    path: '/arena',
    label: 'Apex Arena',
    shortDescription: 'Tactical Shooter, Bubble Shooter, 1v1 AI Duels & Level-Based Study Games',
    showInPublicNav: true,
  },
];

export const SECONDARY_SIDEBAR_ROUTES: NavRouteItem[] = [
  {
    path: '/learn',
    label: 'NCERT-to-PYQ',
    shortDescription: 'Concept-Mapped PYQs, 2027 High-Yield Predictor & NCERT-to-PYQ Split Mapper',
    showInPublicNav: false,
  },
  {
    path: '/preps-ai',
    label: 'Preps AI Chat',
    shortDescription: 'PrepsAI Mentor, Doubt Solver Tutor & Live Classroom synced with your exam track',
    showInPublicNav: false,
  },
  {
    path: '/analytics',
    label: 'Test Analysis',
    shortDescription: 'AI Analytical Assistant, Predicted Percentile, Score Diagnostics & Compact Solutions',
    showInPublicNav: false,
  },
  {
    path: '/mistakes',
    label: 'Mistake Notebook',
    shortDescription: 'AI error pattern diagnosis, SM-2 re-attempt sets & mistake vault',
    showInPublicNav: false,
  },
  {
    path: '/profile',
    label: 'Profile & Streaks',
    shortDescription: 'Student profile, active exam track, Season XP & daily streak calendar',
    showInPublicNav: false,
  },
];

export const MOBILE_BOTTOM_TABS: { path: RoutePath; label: string; langKey: string }[] = [
  { path: '/', label: 'Home', langKey: 'mobile.home' },
  { path: '/materials', label: 'Materials', langKey: 'mobile.materials' },
  { path: '/dpp', label: 'DPPs', langKey: 'mobile.dpp' },
  { path: '/cbt-mocks', label: 'Mocks', langKey: 'mobile.mocks' },
  { path: '/arena', label: 'Arena', langKey: 'mobile.arena' },
];

export const ALL_APP_ROUTES: NavRouteItem[] = [
  ...PUBLIC_NAV_ROUTES,
  ...SECONDARY_SIDEBAR_ROUTES,
  {
    path: '/about',
    label: 'About Prepskm',
    shortDescription: 'About PREPSKM.IN, @unfiltereddsumit & FAQs',
    showInPublicNav: false,
  },
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
