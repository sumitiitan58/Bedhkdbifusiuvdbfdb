import type { MockTestRecord, StudyMaterialRecord } from '../types';

export const CANONICAL_ORIGIN = 'https://prepskm.in';

export function generateCleanSlug(input: string, fallbackPrefix = 'item'): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function getMaterialSlug(material: Pick<StudyMaterialRecord, 'id' | 'slug' | 'seoSlug' | 'title'>): string {
  const raw = material.slug?.trim() || material.seoSlug?.trim();
  if (raw) return generateCleanSlug(raw, material.id);
  return generateCleanSlug(material.title || material.id, material.id);
}

export function getMockTestSlug(test: Pick<MockTestRecord, 'id' | 'slug' | 'title'>): string {
  const raw = test.slug?.trim();
  if (raw) return generateCleanSlug(raw, test.id);
  return generateCleanSlug(test.title || test.id, test.id);
}

const DEFAULT_SUBJECT_SLUGS: Record<string, string> = {
  'subj-physics': 'physics',
  'subj-chemistry': 'chemistry',
  'subj-maths': 'mathematics',
  'subj-mathematics': 'mathematics',
  'subj-biology': 'biology',
  'subj-science': 'science',
};

export function resolveSubjectSlug(subjectId?: string, subjectName?: string): string {
  if (subjectName?.trim()) return generateCleanSlug(subjectName, 'subject');
  if (subjectId && DEFAULT_SUBJECT_SLUGS[subjectId]) return DEFAULT_SUBJECT_SLUGS[subjectId];
  const stripped = (subjectId || 'general').replace(/^subj-/i, '');
  return generateCleanSlug(stripped, 'subject');
}

export function stripChapterNumberPrefix(chapterName: string): string {
  return chapterName.replace(/^\d+\.\s*/, '').trim() || chapterName.trim();
}

export function getHierarchicalMaterialPath(
  material: Pick<StudyMaterialRecord, 'id' | 'slug' | 'seoSlug' | 'title' | 'sectionName' | 'resourceType' | 'subjectId' | 'cohorts'>,
  options?: { subjectName?: string; cohortId?: string }
): string {
  const chapterSlug = getMaterialSlug(material);
  const label = `${material.sectionName ?? ''} ${material.resourceType ?? ''}`.toLowerCase();
  if (label.includes('pyq') || label.includes('previous year')) {
    return `/pyqs/${chapterSlug}`;
  }
  const classSlug = generateCleanSlug(
    options?.cohortId || material.cohorts?.[0] || 'jee-neet',
    'class'
  );
  const subjectSlug = resolveSubjectSlug(material.subjectId, options?.subjectName);
  return `/materials/${classSlug}/${subjectSlug}/${chapterSlug}`;
}

export function getMaterialRoutePath(
  material: Pick<StudyMaterialRecord, 'id' | 'slug' | 'seoSlug' | 'title' | 'sectionName' | 'resourceType'> & {
    subjectId?: string;
    cohorts?: string[];
  },
  options?: { subjectName?: string; cohortId?: string }
): string {
  const slug = getMaterialSlug(material);
  const label = `${material.sectionName ?? ''} ${material.resourceType ?? ''}`.toLowerCase();
  if (label.includes('pyq') || label.includes('previous year')) {
    return `/pyqs/${slug}`;
  }
  if (options?.subjectName || options?.cohortId || material.subjectId || (material.cohorts && material.cohorts.length > 0)) {
    const classSlug = generateCleanSlug(
      options?.cohortId || material.cohorts?.[0] || 'jee-neet',
      'class'
    );
    const subjectSlug = resolveSubjectSlug(material.subjectId, options?.subjectName);
    return `/materials/${classSlug}/${subjectSlug}/${slug}`;
  }
  return `/materials/${slug}`;
}

export function getHierarchicalMockTestPath(
  test: Pick<MockTestRecord, 'id' | 'slug' | 'title' | 'cohortId' | 'examCategory' | 'destination'>
): string {
  const testSlug = getMockTestSlug(test);
  const examSlug = generateCleanSlug(test.cohortId || test.examCategory || 'jee-neet', 'exam');
  if (test.destination === 'dpp') {
    return `/dpp/${examSlug}/${testSlug}`;
  }
  return `/cbt-mocks/${examSlug}/${testSlug}`;
}

export function buildMaterialSeoSummary(params: {
  title: string;
  subjectName: string;
  chapterName: string;
  sectionName: string;
  cohortLabels: string[];
  description?: string;
}): string {
  const examTag = params.cohortLabels.length > 0 ? params.cohortLabels.join(', ') : 'JEE Main, JEE Advanced & NEET UG';
  const customNote = params.description?.trim()
    ? `${params.description.trim()} `
    : '';
  return (
    `${params.title} is an official ${params.sectionName} study resource on Prepskm curated for ${examTag} aspirants preparing ${params.chapterName} in ${params.subjectName}. ` +
    `${customNote}` +
    `Designed around the latest NTA syllabus and NCERT exam weightage, this chapter-wise PDF consolidates essential definitions, standard formulas, high-frequency conceptual traps, and quick revision checkpoints into a single distraction-free reference. ` +
    `Students can read every page directly inside Prepskm's multi-page full PDF viewer on mobile or desktop, zoom into derivations and diagrams without losing clarity, bookmark the chapter for last-minute revision, or download the PDF for offline study. ` +
    `Pair these ${params.chapterName} notes with Prepskm's chapter-wise Daily Practice Problems (DPPs) and NTA-pattern CBT Mock Tests with +4/-1 marking and time-per-question IQ analytics to improve accuracy, speed, and exam-day confidence across ${params.subjectName}.`
  );
}

export function buildMockTestSeoSummary(params: {
  title: string;
  examCategory: string;
  cohortLabel: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  positiveMarks: number;
  negativeMarks: number;
  negativeMarkingEnabled: boolean;
  syllabusSummary?: string;
}): string {
  const markingText = params.negativeMarkingEnabled
    ? `+${params.positiveMarks} for every correct answer and -${params.negativeMarks} for incorrect responses`
    : `+${params.positiveMarks} per correct answer with zero negative marking`;
  const syllabusLine = params.syllabusSummary
    ? `Key syllabus coverage includes ${params.syllabusSummary}. `
    : '';
  return (
    `${params.title} is a free online ${params.examCategory} Computer Based Test (CBT) on Prepskm tailored for ${params.cohortLabel} students. ` +
    `This assessment features ${params.totalQuestions} exam-grade questions worth ${params.totalMarks} total marks to be solved in ${params.durationMinutes} minutes under strict NTA CBT rules (${markingText}). ` +
    `${syllabusLine}` +
    `While attempting the test inside the authentic NTA exam interface, students get a live countdown timer, color-coded Question Palette (Answered, Not Answered, Marked for Review), instant section switching, and support for Single MCQ, Multi-Correct, and Integer numerical inputs. ` +
    `Immediately after submission, Prepskm generates a comprehensive scorecard with subject-wise and chapter-wise accuracy, per-question pacing analysis (Too Fast, Optimal Pace, Too Slow), full step-by-step solutions, and personalized revision insights.`
  );
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(entries: SitemapUrlEntry[]): string {
  const seen = new Set<string>();
  const uniqueEntries = entries.filter((e) => {
    if (!e.loc || seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });

  const rows = uniqueEntries
    .map((entry) => {
      const lastmodTag = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      const changefreqTag = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : '';
      const priorityTag = entry.priority ? `\n    <priority>${entry.priority}</priority>` : '';
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmodTag}${changefreqTag}${priorityTag}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}
