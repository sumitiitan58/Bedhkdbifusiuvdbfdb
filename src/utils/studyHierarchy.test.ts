import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMaterialBucket,
  computeChapterBucketCounts,
  groupChapterMaterialsByTab,
} from './studyHierarchy';
import type { ChapterRecord, StudyMaterialRecord } from '../types';

describe('studyHierarchy', () => {
  it('maps admin-uploaded and starter materials into the 4 chapter sub-tabs cleanly', () => {
    assert.equal(
      classifyMaterialBucket({
        id: 'm1',
        title: 'Electrostatics Concise Notes',
        sectionName: 'Concise Notes',
        resourceType: 'Short Notes',
      }),
      'short-notes'
    );

    assert.equal(
      classifyMaterialBucket({
        id: 'm2',
        title: 'Electrostatics Formula Sheet PDF',
        sectionName: 'Formula Sheets',
        resourceType: 'Formula Sheets',
      }),
      'formula-sheets'
    );

    assert.equal(
      classifyMaterialBucket({
        id: 'm3',
        title: 'Organic Reaction Mind Map & Quick Revision',
        sectionName: 'Revision PDFs',
        resourceType: 'Custom Resources',
      }),
      'mind-maps'
    );

    assert.equal(
      classifyMaterialBucket({
        id: 'm4',
        title: 'JEE Main 2019-2025 Electrostatics PYQs',
        sectionName: 'PYQ Archive',
        resourceType: 'Previous Year Questions (PYQs)',
      }),
      'chapter-pyqs'
    );
  });

  it('aggregates chapter bucket counts and groups chapter materials accurately', () => {
    const chapters: ChapterRecord[] = [
      {
        id: 'ch-1',
        subjectId: 'subj-physics',
        name: 'Electrostatics',
        order: 1,
        cohorts: ['class-12-jee'],
        weightageMarks: 12,
        difficulty: 'Moderate',
      },
    ];

    const materials: StudyMaterialRecord[] = [
      {
        id: 'a',
        title: 'Short Notes',
        subjectId: 'subj-physics',
        chapterId: 'ch-1',
        sectionName: 'Notes',
        resourceType: 'Short Notes',
        cohorts: ['class-12-jee'],
        fileUrl: '/a.pdf',
      },
      {
        id: 'b',
        title: 'Master Formula Sheet',
        subjectId: 'subj-physics',
        chapterId: 'ch-1',
        sectionName: 'Formulas',
        resourceType: 'Formula Sheets',
        cohorts: ['class-12-jee'],
        fileUrl: '/b.pdf',
      },
      {
        id: 'c',
        title: 'Chapter PYQs 2024',
        subjectId: 'subj-physics',
        chapterId: 'ch-1',
        sectionName: 'PYQs',
        resourceType: 'Previous Year Questions (PYQs)',
        cohorts: ['class-12-jee'],
        fileUrl: '/c.pdf',
      },
    ];

    const counts = computeChapterBucketCounts(chapters, materials);
    assert.equal(counts.get('ch-1')?.total, 3);
    assert.equal(counts.get('ch-1')?.byTab['short-notes'], 1);
    assert.equal(counts.get('ch-1')?.byTab['formula-sheets'], 1);
    assert.equal(counts.get('ch-1')?.byTab['chapter-pyqs'], 1);

    const grouped = groupChapterMaterialsByTab(materials);
    assert.equal(grouped['short-notes'].length, 1);
    assert.equal(grouped['formula-sheets'].length, 1);
    assert.equal(grouped['chapter-pyqs'].length, 1);
    assert.equal(grouped['mind-maps'].length, 0);
  });
});
