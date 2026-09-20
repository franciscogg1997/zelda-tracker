// logic.js — pure functions only. No DOM, no storage, no fetch.

export const SCHEMA_VERSION = 1;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function emptyProgress(gameId) {
  return { schemaVersion: SCHEMA_VERSION, gameId, done: {}, flags: {}, notes: {}, updatedAt: 0 };
}

export function parseProgress(raw, gameId) {
  if (raw === null || raw === undefined || raw === '') return { ok: true, progress: emptyProgress(gameId) };
  let obj;
  try { obj = JSON.parse(raw); } catch { return { ok: false, reason: 'invalid-json' }; }
  if (!isObj(obj)) return { ok: false, reason: 'not-object' };
  if (obj.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: 'schema-version' };
  if (obj.gameId !== gameId) return { ok: false, reason: 'game-id' };
  return {
    ok: true,
    progress: {
      schemaVersion: SCHEMA_VERSION,
      gameId,
      done: isObj(obj.done) ? obj.done : {},
      flags: isObj(obj.flags) ? obj.flags : {},
      notes: isObj(obj.notes) ? obj.notes : {},
      updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : 0,
    },
  };
}

export function mergeProgress(existing, incoming, now) {
  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: existing.gameId,
    done: { ...incoming.done, ...existing.done },
    flags: { ...existing.flags, ...incoming.flags },
    notes: { ...existing.notes, ...incoming.notes },
    updatedAt: now,
  };
}

export function serializeProgress(progress) {
  return JSON.stringify(progress, null, 2);
}

export function flattenSteps(game) {
  const out = [];
  for (const section of game.sections) for (const step of section.steps) out.push({ step, section });
  return out;
}

export function sectionProgress(section, progress) {
  let done = 0;
  for (const step of section.steps) if (progress.done[step.id]) done++;
  return { done, total: section.steps.length };
}

export function computeState(game, progress) {
  const flat = flattenSteps(game);
  const index = new Map(flat.map((f, i) => [f.step.id, i]));
  let furthest = -1;
  flat.forEach((f, i) => { if (progress.done[f.step.id]) furthest = i; });
  const currentIndex = furthest + 1;
  const complete = flat.length > 0 && currentIndex >= flat.length;
  const skipped = [];
  for (let i = 0; i < furthest; i++) if (!progress.done[flat[i].step.id]) skipped.push(i);
  const flagged = [];
  flat.forEach((f, i) => { if (progress.flags[f.step.id] !== undefined) flagged.push(i); });
  const counters = game.counters.map((c) => ({
    ...c,
    done: flat.filter((f) => progress.done[f.step.id] && f.step.collect && f.step.collect.counter === c.id).length,
  }));
  return { flat, index, furthest, currentIndex, complete, skipped, flagged, counters };
}
