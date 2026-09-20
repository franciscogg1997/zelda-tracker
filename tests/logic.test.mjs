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
