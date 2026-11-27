import type { NavRouteItem, RoutePath, StudentCohort, StudentCohortId } from '../types';
import { STUDENT_COHORTS } from '../services/platformRegistry';

export const PUBLIC_NAV_ROUTES: NavRouteItem[] = [
  {
    path: '/',
    label: 'Home',
    shortDescription: 'Clean Hero, Tabbed Interactive Study Deck, Daily Trifecta & Quick Launch',
    showInPublicNav: true,
  },
  {
    path: '/learn',
    label: 'Learn & PYQs',
    shortDescription: 'Concept-Mapped PYQs, 2027 High-Yield Predictor & NCERT-to-PYQ Split Mapper',
    showInPublicNav: true,
  },
  {
    path: '/cbt-mocks',
    label: 'CBT Mocks',
    shortDescription: 'Custom Mock Builder (10/25/45Q + AI Balanced), NTA CBT Simulator & Tilt Diagnostics',
    showInPublicNav: true,
  },
  {
    path: '/community',
    label: 'Community',
    shortDescription: 'Live Exam Rooms, Find Study Peers & JoSAA / MCC Rank-to-College Cut-off Explorer',
    showInPublicNav: true,
  },
  {
    path: '/mentors',
    label: 'Mentors & Arena',
    shortDescription: 'Verified IIT/AIIMS 1:1 Mentorship Passes (₹129–₹149) & Apex Arena 1v1 Duels',
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
    path: '/materials',
    label: 'NCERT & Notes',
    shortDescription: 'Concise NCERT chapter notes, formula sheets, mind maps & PDF library',
    showInPublicNav: false,
  },
  {
    path: '/mistakes',
    label: 'Mistake Notebook',
    shortDescription: 'AI error pattern diagnosis, SM-2 re-attempt sets & mistake vault',
    showInPublicNav: false,
  },
  {
    path: '/analytics',
    label: 'Test Analysis',
    shortDescription: 'Prep Score (0–100), Tilt / SM-2 diagnostics & Google Sheets sync',
    showInPublicNav: false,
  },
  {
    path: '/preps-ai',
    label: 'Preps AI Chat',
    shortDescription: 'Full-screen AI mentor synced with live exam context & voice tutor',
    showInPublicNav: false,
  },
  {
    path: '/arena',
    label: 'Apex Arena',
    shortDescription: 'Quantum Clash, Synthesis Strike, Logic Labyrinth & 1v1 AI Point-Trading Duels',
    showInPublicNav: false,
  },
  {
    path: '/profile',
    label: 'Profile & Streaks',
    shortDescription: 'Student profile, active exam track, Season XP & daily streak calendar',
    showInPublicNav: false,
  },
  {
    path: '/pricing',
    label: 'Pricing & Plans',
    shortDescription: 'Free Forever, Prepskm Pro (₹499/yr) & 1:1 IIT/AIIMS Mentorship Packs',
    showInPublicNav: false,
  },
];

export const MOBILE_BOTTOM_TABS: { path: RoutePath; label: string; langKey: string }[] = [
  { path: '/', label: 'Home', langKey: 'mobile.home' },
  { path: '/learn', label: 'Learn', langKey: 'mobile.learn' },
  { path: '/cbt-mocks', label: 'Mocks', langKey: 'mobile.mocks' },
  { path: '/community', label: 'Community', langKey: 'mobile.community' },
  { path: '/mentors', label: 'Mentors', langKey: 'mobile.mentors' },
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
