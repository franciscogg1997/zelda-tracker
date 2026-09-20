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
