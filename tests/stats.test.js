import { test } from 'node:test';
import assert from 'node:assert/strict';

import { emptyState, setStatus } from '../app/js/model.js';
import { percent, summarize } from '../app/js/stats.js';
import { NOW, sampleState } from './fixtures.js';

test('percent округляет и не делит на ноль', () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(2, 3), 67);
  assert.equal(percent(0, 0), null);
});

test('сводка по пустым данным', () => {
  const summary = summarize(emptyState(), NOW);
  assert.equal(summary.total, 0);
  assert.equal(summary.interviewRate, null);
  assert.equal(summary.offerRate, null);
  assert.deepEqual(summary.byStatus, { applied: 0, test: 0, interview: 0, offer: 0, rejected: 0 });
});

test('сводка считает статусы, конверсию и сроки', () => {
  const summary = summarize(sampleState(), NOW);
  assert.equal(summary.total, 2);
  assert.equal(summary.byStatus.applied, 1);
  assert.equal(summary.byStatus.interview, 1);
  assert.equal(summary.interviewRate, 50);
  assert.equal(summary.offerRate, 0);
  assert.equal(summary.upcomingInterviews, 1);
  assert.equal(summary.overdueTasks, 1);
});

test('отказ после собеседования всё равно считается в конверсии', () => {
  let state = setStatus(sampleState(), 'a1', 'offer', NOW);
  state = setStatus(state, 'a1', 'rejected', NOW);
  state = setStatus(state, 'a2', 'interview', NOW);
  state = setStatus(state, 'a2', 'rejected', NOW);

  const summary = summarize(state, NOW);
  assert.equal(summary.byStatus.rejected, 2);
  assert.equal(summary.interviewRate, 100);
  assert.equal(summary.offerRate, 50);
});
