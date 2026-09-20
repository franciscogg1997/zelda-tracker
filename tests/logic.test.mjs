import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMA_VERSION, emptyProgress, parseProgress, mergeProgress, serializeProgress,
} from '../logic.js';

test('emptyProgress has the schema shape', () => {
  assert.deepEqual(emptyProgress('oot'), {
    schemaVersion: SCHEMA_VERSION, gameId: 'oot', done: {}, flags: {}, notes: {}, updatedAt: 0,
  });
});

test('parseProgress: null or empty gives empty progress', () => {
  assert.deepEqual(parseProgress(null, 'oot'), { ok: true, progress: emptyProgress('oot') });
  assert.deepEqual(parseProgress('', 'oot'), { ok: true, progress: emptyProgress('oot') });
});

test('parseProgress: valid blob round-trips and fills missing maps', () => {
  const raw = JSON.stringify({ schemaVersion: 1, gameId: 'oot', done: { 'oot-0001': 5 }, updatedAt: 9 });
  const r = parseProgress(raw, 'oot');
  assert.equal(r.ok, true);
  assert.deepEqual(r.progress, {
    schemaVersion: 1, gameId: 'oot', done: { 'oot-0001': 5 }, flags: {}, notes: {}, updatedAt: 9,
  });
});

test('parseProgress: rejects bad input with a reason', () => {
  assert.deepEqual(parseProgress('{not json', 'oot'), { ok: false, reason: 'invalid-json' });
  assert.deepEqual(parseProgress('42', 'oot'), { ok: false, reason: 'not-object' });
  assert.deepEqual(parseProgress(JSON.stringify({ schemaVersion: 2, gameId: 'oot' }), 'oot'), { ok: false, reason: 'schema-version' });
  assert.deepEqual(parseProgress(JSON.stringify({ schemaVersion: 1, gameId: 'mm' }), 'oot'), { ok: false, reason: 'game-id' });
});

test('mergeProgress: union of done, existing timestamps win, notes and flags override', () => {
  const a = { ...emptyProgress('oot'), done: { 'oot-0001': 1, 'oot-0002': 2 }, notes: { 'oot-0001': 'old' }, flags: { 'oot-0002': 'x' }, updatedAt: 10 };
  const b = { ...emptyProgress('oot'), done: { 'oot-0002': 99, 'oot-0003': 3 }, notes: { 'oot-0001': 'new' }, flags: { 'oot-0003': 'y' }, updatedAt: 20 };
  const m = mergeProgress(a, b, 50);
  assert.deepEqual(m.done, { 'oot-0001': 1, 'oot-0002': 2, 'oot-0003': 3 });
  assert.deepEqual(m.notes, { 'oot-0001': 'new' });
  assert.deepEqual(m.flags, { 'oot-0002': 'x', 'oot-0003': 'y' });
  assert.equal(m.updatedAt, 50);
  assert.equal(m.gameId, 'oot');
});

test('serializeProgress produces parseable pretty JSON', () => {
  const p = { ...emptyProgress('oot'), done: { 'oot-0001': 1 } };
  const s = serializeProgress(p);
  assert.ok(s.includes('\n'));
  assert.deepEqual(parseProgress(s, 'oot').progress, p);
});

import { flattenSteps, computeState, sectionProgress } from '../logic.js';

const G = {
  id: 'g', title: 'G',
  counters: [{ id: 'heart', label: 'Heart pieces', total: 2 }, { id: 'song', label: 'Songs', total: 1 }],
  sections: [
    { id: 'a', title: 'A', steps: [
      { id: 'g-0001', text: 'one' },
      { id: 'g-0002', text: 'two', collect: { counter: 'heart', n: 1 } },
    ] },
    { id: 'b', title: 'B', steps: [
      { id: 'g-0003', text: 'three', collect: { counter: 'song', n: 1 } },
      { id: 'g-0004', text: 'four', collect: { counter: 'heart', n: 2 } },
    ] },
  ],
};
const prog = (done, flags = {}) => ({ ...emptyProgress('g'), done, flags });

test('flattenSteps keeps file order and section', () => {
  const f = flattenSteps(G);
  assert.deepEqual(f.map((x) => x.step.id), ['g-0001', 'g-0002', 'g-0003', 'g-0004']);
  assert.equal(f[2].section.id, 'b');
});

test('computeState with nothing done', () => {
  const s = computeState(G, prog({}));
  assert.equal(s.furthest, -1);
  assert.equal(s.currentIndex, 0);
  assert.equal(s.complete, false);
  assert.deepEqual(s.skipped, []);
  assert.deepEqual(s.counters.map((c) => [c.id, c.done, c.total]), [['heart', 0, 2], ['song', 0, 1]]);
  assert.equal(s.index.get('g-0003'), 2);
});

test('computeState: current is after the furthest done, skipped are earlier undone', () => {
  const s = computeState(G, prog({ 'g-0001': 1, 'g-0003': 3 }));
  assert.equal(s.furthest, 2);
  assert.equal(s.currentIndex, 3);
  assert.deepEqual(s.skipped, [1]);
  assert.deepEqual(s.counters.map((c) => c.done), [0, 1]);
});

test('computeState: far-ahead done moves current forward; all done is complete', () => {
  const s = computeState(G, prog({ 'g-0004': 1 }));
  assert.equal(s.currentIndex, 4);
  assert.equal(s.complete, true);
  assert.deepEqual(s.skipped, [0, 1, 2]);
  const all = computeState(G, prog({ 'g-0001': 1, 'g-0002': 1, 'g-0003': 1, 'g-0004': 1 }));
  assert.equal(all.complete, true);
  assert.deepEqual(all.skipped, []);
  assert.deepEqual(all.counters.map((c) => c.done), [2, 1]);
});

test('computeState: flagged indices', () => {
  const s = computeState(G, prog({}, { 'g-0002': 'wrong' }));
  assert.deepEqual(s.flagged, [1]);
});

test('sectionProgress counts done steps in a section', () => {
  assert.deepEqual(sectionProgress(G.sections[1], prog({ 'g-0003': 1 })), { done: 1, total: 2 });
});
