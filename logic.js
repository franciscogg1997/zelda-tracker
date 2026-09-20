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

export const isSide = (step) => step.kind === 'side';
export const stepVisible = (step, hideSide) => !hideSide || !isSide(step);

export function sectionProgress(section, progress, { hideSide = false } = {}) {
  let done = 0;
  let total = 0;
  for (const step of section.steps) {
    if (!stepVisible(step, hideSide)) continue;
    total++;
    if (progress.done[step.id]) done++;
  }
  return { done, total };
}

export function computeState(game, progress, { hideSide = false } = {}) {
  const flat = flattenSteps(game);
  const index = new Map(flat.map((f, i) => [f.step.id, i]));
  const shown = (i) => stepVisible(flat[i].step, hideSide);
  let furthest = -1;
  flat.forEach((f, i) => { if (progress.done[f.step.id] && shown(i)) furthest = i; });
  let currentIndex = furthest + 1;
  while (currentIndex < flat.length && (!shown(currentIndex) || progress.done[flat[currentIndex].step.id])) currentIndex++;
  const visibleCount = flat.reduce((n, f, i) => n + (shown(i) ? 1 : 0), 0);
  const skipped = [];
  for (let i = 0; i < furthest; i++) if (!progress.done[flat[i].step.id] && shown(i)) skipped.push(i);
  // Complete means nothing is outstanding: past the last step AND nothing skipped along the way.
  const complete = visibleCount > 0 && currentIndex >= flat.length && skipped.length === 0;
  const flagged = [];
  flat.forEach((f, i) => { if (progress.flags[f.step.id] !== undefined) flagged.push(i); });
  const sideTotal = flat.reduce((n, f) => n + (isSide(f.step) ? 1 : 0), 0);
  const counters = game.counters.map((c) => ({
    ...c,
    done: flat.filter((f) => progress.done[f.step.id] && f.step.collect && f.step.collect.counter === c.id).length,
  }));
  return { flat, index, furthest, currentIndex, complete, skipped, flagged, counters, visibleCount, sideTotal, hideSide };
}

const STEP_KEYS = new Set(['id', 'text', 'detail', 'collect', 'missable', 'kind']);
export const STEP_KINDS = new Set(['main', 'side']);
const SECTION_KEYS = new Set(['id', 'title', 'subtitle', 'steps']);
export const MAX_TEXT = 280;

export function validateGame(game, { partial = false } = {}) {
  const errors = [];
  const warnings = [];
  const summary = { steps: 0, sections: [], counters: [], missables: [] };
  if (!isObj(game)) return { errors: ['game file is not a JSON object'], warnings, summary };
  for (const k of ['id', 'title', 'counters', 'sections']) if (game[k] === undefined) errors.push(`missing top-level field "${k}"`);
  if (errors.length) return { errors, warnings, summary };
  if (typeof game.id !== 'string' || !/^[a-z0-9-]+$/.test(game.id)) errors.push('id must be a lowercase slug');
  if (typeof game.title !== 'string' || !game.title.trim()) errors.push('title must be a non-empty string');
  if (!Array.isArray(game.counters)) errors.push('counters must be an array');
  if (!Array.isArray(game.sections)) errors.push('sections must be an array');
  if (errors.length) return { errors, warnings, summary };

  const counterIds = new Set();
  for (const c of game.counters) {
    if (!isObj(c) || typeof c.id !== 'string') { errors.push('counter without id'); continue; }
    if (counterIds.has(c.id)) errors.push(`duplicate counter id "${c.id}"`);
    counterIds.add(c.id);
    if (typeof c.label !== 'string' || !c.label.trim()) errors.push(`counter ${c.id}: label required`);
    if (c.unit !== undefined && (typeof c.unit !== 'string' || !c.unit.trim())) errors.push(`counter ${c.id}: unit must be a non-empty string`);
    if (!Number.isInteger(c.total) || c.total <= 0) errors.push(`counter ${c.id}: total must be a positive integer`);
  }

  const idRe = new RegExp(`^${game.id}-\\d{4}$`);
  const stepIds = new Set();
  const sectionIds = new Set();
  const seen = new Map(); // counterId -> Map(n -> stepId)
  for (const s of game.sections) {
    if (!isObj(s) || typeof s.id !== 'string') { errors.push('section without id'); continue; }
    if (sectionIds.has(s.id)) errors.push(`duplicate section id "${s.id}"`);
    sectionIds.add(s.id);
    for (const k of Object.keys(s)) if (!SECTION_KEYS.has(k)) errors.push(`section ${s.id}: unknown field "${k}"`);
    if (typeof s.title !== 'string' || !s.title.trim()) errors.push(`section ${s.id}: title required`);
    if (!Array.isArray(s.steps) || s.steps.length === 0) { errors.push(`section ${s.id}: needs at least one step`); continue; }
    summary.sections.push({ id: s.id, title: s.title, steps: s.steps.length });
    for (const st of s.steps) {
      if (!isObj(st) || typeof st.id !== 'string') { errors.push(`section ${s.id}: step without id`); continue; }
      if (!idRe.test(st.id)) errors.push(`${st.id}: id must match ${game.id}-NNNN`);
      if (stepIds.has(st.id)) errors.push(`${st.id}: duplicate step id`);
      stepIds.add(st.id);
      for (const k of Object.keys(st)) if (!STEP_KEYS.has(k)) errors.push(`${st.id}: unknown field "${k}"`);
      if (typeof st.text !== 'string' || !st.text.trim()) errors.push(`${st.id}: text required`);
      else if (st.text.length > MAX_TEXT) errors.push(`${st.id}: text longer than ${MAX_TEXT} chars (${st.text.length})`);
      for (const k of ['detail', 'missable']) {
        if (st[k] !== undefined && (typeof st[k] !== 'string' || !st[k].trim())) errors.push(`${st.id}: ${k} must be a non-empty string`);
      }
      if (st.kind !== undefined && !STEP_KINDS.has(st.kind)) errors.push(`${st.id}: kind must be "main" or "side"`);
      if (st.missable) summary.missables.push({ id: st.id, text: st.missable });
      if (st.collect !== undefined) {
        const c = st.collect;
        if (!isObj(c) || !counterIds.has(c.counter)) errors.push(`${st.id}: collect.counter must be a known counter id`);
        else if (!Number.isInteger(c.n) || c.n < 1) errors.push(`${st.id}: collect.n must be a positive integer`);
        else {
          if (!seen.has(c.counter)) seen.set(c.counter, new Map());
          const m = seen.get(c.counter);
          if (m.has(c.n)) errors.push(`${st.id}: ${c.counter} ${c.n} already collected by ${m.get(c.n)}`);
          else m.set(c.n, st.id);
        }
      }
    }
  }
  summary.steps = stepIds.size;

  const completeness = partial ? warnings : errors;
  for (const c of game.counters) {
    if (!isObj(c) || typeof c.id !== 'string' || !Number.isInteger(c.total)) continue;
    const m = seen.get(c.id) || new Map();
    summary.counters.push({ id: c.id, seen: m.size, total: c.total });
    const missing = [];
    for (let n = 1; n <= c.total; n++) if (!m.has(n)) missing.push(n);
    const extra = [...m.keys()].filter((n) => n > c.total).sort((a, b) => a - b);
    if (missing.length) completeness.push(`counter ${c.id}: missing ${compressRanges(missing)} (${m.size}/${c.total} defined)`);
    if (extra.length) completeness.push(`counter ${c.id}: numbers above total: ${extra.join(', ')}`);
  }
  return { errors, warnings, summary };
}

function compressRanges(nums) {
  const out = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i <= nums.length; i++) {
    const n = nums[i];
    if (n === prev + 1) { prev = n; continue; }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = n; prev = n;
  }
  return out.join(', ');
}
