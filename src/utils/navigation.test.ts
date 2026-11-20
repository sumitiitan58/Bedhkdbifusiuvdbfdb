import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_APP_ROUTES,
  PUBLIC_NAV_ROUTES,
  filterCohortsByStream,
  getCohortById,
  isRouteActive,
} from './navigation.ts';
import { STARTER_CLASS_GROUPS, STUDENT_COHORTS } from '../services/platformRegistry.ts';

test('PUBLIC_NAV_ROUTES exposes all 7 required Navbar links and ALL_APP_ROUTES includes /profile', () => {
  const navPaths = PUBLIC_NAV_ROUTES.map((r) => r.path);
  assert.deepEqual(navPaths, [
    '/',
    '/materials',
    '/lectures',
    '/cbt-mocks',
    '/dpp',
    '/analytics',
    '/admin',
  ]);
  assert.ok(ALL_APP_ROUTES.some((r) => r.path === '/profile'));
});

test('isRouteActive matches exact root and nested module paths', () => {
  assert.equal(isRouteActive('/', '/'), true);
  assert.equal(isRouteActive('/materials', '/'), false);
  assert.equal(isRouteActive('/materials', '/materials'), true);
  assert.equal(isRouteActive('/materials/', '/materials'), true);
  assert.equal(isRouteActive('/cbt-mocks/paper-1', '/cbt-mocks'), true);
  assert.equal(isRouteActive('/cbt', '/cbt-mocks'), false);
});

test('STARTER_CLASS_GROUPS and STUDENT_COHORTS cover Foundation, Board, JEE & NEET streams accurately', () => {
  assert.equal(STARTER_CLASS_GROUPS.length, 5);
  const class11 = STARTER_CLASS_GROUPS.find((g) => g.name === 'Class 11');
  assert.ok(class11);
  assert.deepEqual(
    class11.subClasses.map((s) => s.stream),
    ['Board', 'JEE', 'NEET']
  );
  assert.equal(STUDENT_COHORTS.length, 10);
  assert.equal(filterCohortsByStream('NEET').length, 3);
  assert.equal(filterCohortsByStream('JEE').length, 3);
  assert.equal(getCohortById('jee-dropper').label, 'JEE Droppers');
});
