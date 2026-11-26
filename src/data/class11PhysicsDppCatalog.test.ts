import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_11_PHYSICS_DPP_QUESTIONS,
  CLASS_11_PHYSICS_DPP_TESTS,
} from './class11PhysicsDppCatalog';
import { JEE_CONCISE_CHAPTERS } from './jeeConciseNotesCatalog';

describe('class11PhysicsDppCatalog', () => {
  it('provides all 14 published Class 11 Physics chapter-wise DPPs mapped to valid chapters', () => {
    assert.equal(CLASS_11_PHYSICS_DPP_TESTS.length, 14);
    const validChapterIds = new Set(JEE_CONCISE_CHAPTERS.map((c) => c.id));
    const seenTestIds = new Set<string>();

    for (const test of CLASS_11_PHYSICS_DPP_TESTS) {
      assert.equal(test.destination, 'dpp');
      assert.equal(test.status, 'published');
      assert.equal(test.subjectId, 'subj-physics');
      assert.ok(test.chapterId && validChapterIds.has(test.chapterId), `Invalid chapterId for ${test.id}: ${test.chapterId}`);
      assert.ok(!seenTestIds.has(test.id), `Duplicate testId: ${test.id}`);
      seenTestIds.add(test.id);

      const chapterQs = CLASS_11_PHYSICS_DPP_QUESTIONS.filter((q) => q.testId === test.id);
      assert.equal(
        chapterQs.length,
        test.totalQuestions,
        `Question count mismatch for ${test.id}: expected ${test.totalQuestions}, got ${chapterQs.length}`
      );
      assert.equal(test.totalMarks, test.totalQuestions * 4);
    }
  });

  it('enforces strict cropping across all 347 questions: clean question, clean option values, clean solutions, and composite diagrams', () => {
    assert.equal(CLASS_11_PHYSICS_DPP_QUESTIONS.length, 347);
    const seenQuestionIds = new Set<string>();
    let diagramCount = 0;

    for (const q of CLASS_11_PHYSICS_DPP_QUESTIONS) {
      assert.ok(!seenQuestionIds.has(q.id), `Duplicate questionId: ${q.id}`);
      seenQuestionIds.add(q.id);

      const qText = (q.questionText ?? '').trim();
      assert.ok(qText.length >= 12, `Question text too short for ${q.id}`);
      assert.ok(!/^Q\.\s*\d+/i.test(qText), `Question number leaked into questionText for ${q.id}: ${qText}`);
      assert.ok(!/\b(EASY|MEDIUM|HARD)\b/.test(qText), `Difficulty tag leaked into questionText for ${q.id}`);
      assert.ok(!/\bAns\s*:/i.test(qText), `Answer leaked into questionText for ${q.id}`);
      assert.ok(!/\(A\)\s*\S+.*\(B\)/i.test(qText), `Options leaked into questionText for ${q.id}`);

      if (q.questionType === 'integer') {
        assert.ok(
          q.numericalAnswer !== undefined && /^-?\d+(\.\d+)?$/.test(q.numericalAnswer.trim()),
          `Invalid numericalAnswer for ${q.id}: ${q.numericalAnswer}`
        );
      } else {
        assert.ok(Array.isArray(q.optionTexts) && q.optionTexts.length === 4, `Expected 4 options for ${q.id}`);
        const uniqueOpts = new Set<string>();
        for (const opt of q.optionTexts) {
          const trimmed = opt.trim();
          assert.ok(trimmed.length > 0, `Empty option in ${q.id}`);
          assert.ok(!/^\([A-D]\)/i.test(trimmed), `Option letter prefix (A)-(D) leaked in ${q.id}: ${trimmed}`);
          assert.ok(!/^[A-D]\)\s*/.test(trimmed), `Option letter prefix A)-D) leaked in ${q.id}: ${trimmed}`);
          uniqueOpts.add(trimmed);
        }
        assert.equal(uniqueOpts.size, 4, `Duplicate option values in ${q.id}: ${JSON.stringify(q.optionTexts)}`);
        assert.ok(
          Array.isArray(q.correctOptionIndices) &&
            q.correctOptionIndices.length === 1 &&
            q.correctOptionIndices[0] >= 0 &&
            q.correctOptionIndices[0] <= 3,
          `Invalid correctOptionIndices for ${q.id}`
        );
      }

      const sol = (q.solutionText ?? '').trim();
      assert.ok(sol.length >= 10, `Solution too short for ${q.id}`);
      assert.ok(!/^STEP-BY-STEP SOLUTION/i.test(sol), `Header leaked into solutionText for ${q.id}`);
      assert.ok(!/^Ans\s*:/i.test(sol), `Ans: prefix leaked into solutionText for ${q.id}`);

      if (q.questionImageUrl) {
        diagramCount += 1;
        assert.ok(
          q.questionImageUrl.startsWith('data:image/svg+xml;charset=utf-8,'),
          `Expected SVG data URI for ${q.id}`
        );
        assert.ok(
          q.questionImageUrl.includes('data-composite-question'),
          `Expected data-composite-question marker for ${q.id}`
        );
      }
    }

    assert.ok(diagramCount >= 20, `Expected at least 20 physics diagrams, got ${diagramCount}`);
  });
});
