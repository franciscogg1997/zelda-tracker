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

import { validateGame } from '../logic.js';

const good = () => JSON.parse(JSON.stringify(G));

test('validateGame: the fixture is valid', () => {
  const r = validateGame(good());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.summary.steps, 4);
  assert.deepEqual(r.summary.counters, [{ id: 'heart', seen: 2, total: 2 }, { id: 'song', seen: 1, total: 1 }]);
});

test('validateGame: structural errors', () => {
  const g = good();
  g.sections[0].steps[0].id = 'x-0001';
  g.sections[1].steps.push({ id: 'g-0003', text: 'dup' });
  g.sections[1].steps.push({ id: 'g-0009', text: '' });
  g.sections[1].steps.push({ id: 'g-0010', text: 'y'.repeat(281) });
  g.sections[1].steps.push({ id: 'g-0011', text: 'bad collect', collect: { counter: 'nope', n: 1 } });
  g.sections[1].steps.push({ id: 'g-0012', text: 'extra key', foo: 1 });
  const { errors } = validateGame(g);
  assert.ok(errors.some((e) => e.includes('x-0001')));
  assert.ok(errors.some((e) => e.includes('duplicate step id')));
  assert.ok(errors.some((e) => e.includes('g-0009') && e.includes('text')));
  assert.ok(errors.some((e) => e.includes('g-0010') && e.includes('280')));
  assert.ok(errors.some((e) => e.includes('g-0011') && e.includes('collect.counter')));
  assert.ok(errors.some((e) => e.includes('g-0012') && e.includes('unknown field')));
});

test('validateGame: duplicate n, gap and wrong total are caught', () => {
  const dup = good(); dup.sections[1].steps[1].collect.n = 1;
  assert.ok(validateGame(dup).errors.some((e) => e.includes('heart 1 already collected')));
  const gap = good(); gap.sections[1].steps[1].collect.n = 3;
  const ge = validateGame(gap).errors;
  assert.ok(ge.some((e) => e.includes('counter heart') && e.includes('missing 2')));
  assert.ok(ge.some((e) => e.includes('counter heart') && e.includes('above total')));
  const total = good(); total.counters[0].total = 3;
  assert.ok(validateGame(total).errors.some((e) => e.includes('missing 3')));
});

test('validateGame: partial mode turns completeness into warnings', () => {
  const g = good(); g.sections.pop();
  const r = validateGame(g, { partial: true });
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('counter heart')));
  assert.ok(r.warnings.some((w) => w.includes('counter song')));
});

test('validateGame: missables are summarised', () => {
  const g = good(); g.sections[0].steps[0].missable = 'Do it now.';
  assert.deepEqual(validateGame(g).summary.missables, [{ id: 'g-0001', text: 'Do it now.' }]);
});
