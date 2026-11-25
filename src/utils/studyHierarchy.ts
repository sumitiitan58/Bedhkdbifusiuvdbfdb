import type { ChapterRecord, StudyMaterialRecord } from '../types';

export type ChapterResourceTabId =
  | 'short-notes'
  | 'formula-sheets'
  | 'mind-maps'
  | 'chapter-pyqs';

export interface ChapterResourceTabMeta {
  id: ChapterResourceTabId;
  label: string;
  shortLabel: string;
  description: string;
}

export const CHAPTER_RESOURCE_TABS: ChapterResourceTabMeta[] = [
  {
    id: 'short-notes',
    label: 'Short Notes',
    shortLabel: 'Short Notes',
    description: 'High-yield concise chapter notes & concept explanations',
  },
  {
    id: 'formula-sheets',
    label: 'Formula Sheets',
    shortLabel: 'Formula Sheets',
    description: 'Rapid-revision equations, identities & master formula PDFs',
  },
  {
    id: 'mind-maps',
    label: 'Mind Maps / Revision PDFs',
    shortLabel: 'Mind Maps & Revision',
    description: 'Visual mind maps, reaction charts & quick revision sheets',
  },
  {
    id: 'chapter-pyqs',
    label: 'Chapter PYQs',
    shortLabel: 'Chapter PYQs',
    description: 'Previous Year Questions, important problems & practice sheets',
  },
];

/**
 * Automatically maps any catalog or admin-uploaded study material into one of the
 * 4 hierarchical Chapter Detail sub-tabs based on resourceType, sectionName, and title.
 */
export function classifyMaterialBucket(
  material: Pick<StudyMaterialRecord, 'title' | 'sectionName' | 'resourceType' | 'id' | 'mediaType'>
): ChapterResourceTabId {
  const combined = `${material.resourceType ?? ''} ${material.sectionName ?? ''} ${material.title ?? ''}`.toLowerCase();

  if (
    combined.includes('pyq') ||
    combined.includes('previous year') ||
    combined.includes('important question') ||
    combined.includes('dpp') ||
    combined.includes('question bank') ||
    combined.includes('archive')
  ) {
    return 'chapter-pyqs';
  }

  if (combined.includes('formula') || material.id.includes('-master')) {
    return 'formula-sheets';
  }

  if (
    combined.includes('mind map') ||
    combined.includes('mindmap') ||
    combined.includes('mind-map') ||
    combined.includes('revision') ||
    combined.includes('cheat sheet') ||
    combined.includes('cheatsheet') ||
    combined.includes('summary') ||
    combined.includes('handbook') ||
    combined.includes('custom resource')
  ) {
    return 'mind-maps';
  }

  return 'short-notes';
}

export interface ChapterBucketCounts {
  total: number;
  byTab: Record<ChapterResourceTabId, number>;
}

export function groupChapterMaterialsByTab(
  chapterMaterials: StudyMaterialRecord[]
): Record<ChapterResourceTabId, StudyMaterialRecord[]> {
  const grouped: Record<ChapterResourceTabId, StudyMaterialRecord[]> = {
    'short-notes': [],
    'formula-sheets': [],
    'mind-maps': [],
    'chapter-pyqs': [],
  };

  for (const mat of chapterMaterials) {
    const bucket = classifyMaterialBucket(mat);
    grouped[bucket].push(mat);
  }

  for (const key of Object.keys(grouped) as ChapterResourceTabId[]) {
    grouped[key].sort((a, b) => a.title.localeCompare(b.title));
  }

  return grouped;
}

export function computeChapterBucketCounts(
  chapters: ChapterRecord[],
  materials: StudyMaterialRecord[]
): Map<string, ChapterBucketCounts> {
  const result = new Map<string, ChapterBucketCounts>();

  for (const ch of chapters) {
    result.set(ch.id, {
      total: 0,
      byTab: {
        'short-notes': 0,
        'formula-sheets': 0,
        'mind-maps': 0,
        'chapter-pyqs': 0,
      },
    });
  }

  for (const mat of materials) {
    const entry = result.get(mat.chapterId);
    if (!entry) continue;
    const bucket = classifyMaterialBucket(mat);
    entry.total += 1;
    entry.byTab[bucket] += 1;
  }

  return result;
}
