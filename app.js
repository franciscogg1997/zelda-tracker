import {
  emptyProgress, parseProgress, mergeProgress, serializeProgress,
  computeState, sectionProgress, validateGame, stepVisible, isSide,
} from './logic.js';

export const APP_VERSION = '1.0.0';

const els = {
  top: document.getElementById('top'),
  title: document.getElementById('game-title'),
  select: document.getElementById('game-select'),
  counters: document.getElementById('counters'),
  notices: document.getElementById('notices'),
  main: document.getElementById('main'),
  skipped: document.getElementById('btn-skipped'),
  skippedCount: document.getElementById('skipped-count'),
  cont: document.getElementById('btn-continue'),
  menu: document.getElementById('btn-menu'),
  sheet: document.getElementById('sheet'),
};

const store = {
  read(k) { try { return localStorage.getItem(k); } catch { return null; } },
  write(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let gameId = null;
let game = null;
let progress = null;
let ui = null;
let state = null;
let view = 'all'; // 'all' | 'skipped' | 'flagged'

// ---------- boot ----------
async function boot() {
  // The browser restores the previous scroll position after load, which would undo
  // our jump to the current step. We place the view ourselves.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  try { navigator.storage?.persist?.(); } catch { /* ignore */ }
  measureHeader();
  window.addEventListener('resize', measureHeader);
  let games;
  try { games = await fetchJson('./data/index.json'); }
  catch { fatal('Could not load the game list. Open this page once with internet.'); return; }
  const last = store.read('zt:lastGame');
  gameId = games.some((g) => g.id === last) ? last : games[0].id;
  els.select.hidden = games.length < 2;
  els.select.innerHTML = games.map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`).join('');
  els.select.value = gameId;
  els.select.onchange = () => { store.write('zt:lastGame', els.select.value); location.reload(); };
  wireBottomBar();
  await loadGame();
  maybeInstallHint();
}

function measureHeader() {
  document.documentElement.style.setProperty('--header-h', `${els.top.offsetHeight}px`);
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

async function loadGame() {
  let data;
  try { data = await fetchJson(`./data/${gameId}.json`); }
  catch { fatal('Walkthrough not available offline yet. Open this page once with internet.'); return; }
  const { errors, warnings } = validateGame(data, { partial: true });
  if (errors.length) { fatal(`data/${gameId}.json failed validation:\n${errors.slice(0, 12).join('\n')}`); return; }
  game = data;
  document.title = game.title;
  els.title.textContent = game.title;
  progress = loadProgress();
  ui = loadUi();
  recompute();
  renderAll();
  measureHeader();
  placeViewOnCurrent();
  for (const w of warnings) notice(`Content incomplete: ${w}`, { id: `warn-${w.slice(0, 24)}` });
}

// ---------- persistence ----------
function loadProgress() {
  const key = `zt:progress:${gameId}`;
  const raw = store.read(key);
  const res = parseProgress(raw, gameId);
  if (res.ok) return res.progress;
  store.write(`${key}:corrupt:${Date.now()}`, raw);
  notice(`Saved progress could not be read (${res.reason}). The raw data was preserved under a backup key and a fresh progress was started.`, { id: 'corrupt', error: true });
  return emptyProgress(gameId);
}
function saveProgress() {
  progress.updatedAt = Date.now();
  if (!store.write(`zt:progress:${gameId}`, JSON.stringify(progress))) {
    notice('Progress is not being saved. Storage is unavailable in this browser.', { id: 'nosave', error: true });
  }
}
function loadUi() {
  try { const u = JSON.parse(store.read(`zt:ui:${gameId}`)); return u && typeof u === 'object' ? u : {}; } catch { return {}; }
}
function saveUi() { store.write(`zt:ui:${gameId}`, JSON.stringify(ui)); }
function recompute() { state = computeState(game, progress, { hideSide: !!ui.hideSide }); }

// ---------- rendering ----------
function renderAll() {
  renderCounters();
  els.main.innerHTML = '';
  if (view === 'all') renderSections(); else renderFiltered();
  renderBottomBar();
}

function renderCounters() {
  els.counters.innerHTML = state.counters.map((c) =>
    `<div class="counter${c.done >= c.total ? ' complete' : ''}"><span class="label">${esc(c.label)}</span><span class="value">${c.done}/${c.total}</span></div>`).join('');
}

// Sections render their rows only once opened: the full walkthrough is ~2000 steps,
// and building every row up front makes scrolling stutter on a phone.
function fillSection(det, section) {
  const list = det.querySelector('.steps');
  if (list.dataset.filled === '1') return;
  const frag = document.createDocumentFragment();
  for (const step of section.steps) {
    if (stepVisible(step, !!ui.hideSide)) frag.append(renderRow(step));
  }
  list.append(frag);
  list.dataset.filled = '1';
}

function renderSections() {
  ui.sections ??= {};
  const currentSectionId = state.flat[state.currentIndex]?.section.id;
  const frag = document.createDocumentFragment();
  for (const section of game.sections) {
    const sp = sectionProgress(section, progress, { hideSide: !!ui.hideSide });
    if (sp.total === 0) continue; // every step in it is hidden
    const det = document.createElement('details');
    det.className = 'section';
    det.dataset.id = section.id;
    const pref = ui.sections[section.id];
    det.open = pref === 'open' ? true : pref === 'closed' ? false : section.id === currentSectionId;
    det.dataset.state = det.open ? 'open' : 'closed';
    det.innerHTML = `<summary><span><span class="s-title">${esc(section.title)}</span>${section.subtitle ? `<span class="s-sub">${esc(section.subtitle)}</span>` : ''}</span><span class="s-count">${sp.done}/${sp.total}</span><span class="s-chev"></span></summary><div class="steps"></div>`;
    if (det.open) fillSection(det, section);
    det.addEventListener('toggle', () => {
      if (det.open) fillSection(det, section);
      const now = det.open ? 'open' : 'closed';
      if (now === det.dataset.state) return; // programmatic, not a user toggle
      det.dataset.state = now;
      ui.sections[section.id] = now;
      saveUi();
    });
    frag.append(det);
  }
  els.main.append(frag);
}

function renderRow(step, { caption } = {}) {
  const done = !!progress.done[step.id];
  const flagged = progress.flags[step.id] !== undefined;
  const note = progress.notes[step.id];
  const isCurrent = state.flat[state.currentIndex]?.step.id === step.id;
  const counter = step.collect ? game.counters.find((c) => c.id === step.collect.counter) : null;
  const row = document.createElement('div');
  row.className = `row${done ? ' done' : ''}${isCurrent ? ' current' : ''}${flagged ? ' flagged' : ''}`;
  row.dataset.id = step.id;
  row.innerHTML = `
    <button class="check" aria-label="${done ? 'Mark not done' : 'Mark done'}"></button>
    <div class="body">
      ${caption ? `<div class="caption">${esc(caption)}</div>` : ''}
      ${isCurrent ? '<div class="next-label">Next</div>' : ''}
      <div class="text">${esc(step.text)}</div>
      <div class="meta">
        ${isSide(step) ? '<span class="pill side">Optional</span>' : ''}
        ${counter ? `<span class="pill">${esc(counter.unit || counter.label)} ${step.collect.n}</span>` : ''}
        ${flagged ? '<span class="pill flag">Flagged</span>' : ''}
        ${step.detail ? '<button class="more">more</button>' : ''}
      </div>
      ${step.detail ? `<div class="detail" hidden>${esc(step.detail)}</div>` : ''}
      ${note ? `<div class="note">${esc(note)}</div>` : ''}
      ${step.missable ? `<div class="missable"><span class="mark">!</span><span>${esc(step.missable)}</span></div>` : ''}
    </div>
    <button class="dots" aria-label="Step options">···</button>`;
  row.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.dots')) { openStepSheet(step); return; }
    if (t.closest('.more')) {
      const d = row.querySelector('.detail');
      d.hidden = !d.hidden;
      t.textContent = d.hidden ? 'more' : 'less';
      return;
    }
    toggleDone(step);
  });
  return row;
}

function renderFiltered() {
  const indices = view === 'skipped' ? state.skipped : state.flagged;
  const title = view === 'skipped' ? 'Skipped' : 'Flagged';
  const head = document.createElement('div');
  head.className = 'view-head';
  head.innerHTML = `<button class="back">‹ Back</button><h2>${title} <span class="count">(${indices.length})</span></h2>`;
  head.querySelector('.back').onclick = () => { view = 'all'; renderAll(); };
  els.main.append(head);
  if (indices.length === 0) {
    const p = document.createElement('div');
    p.className = 'empty';
    p.textContent = view === 'skipped' ? 'Nothing skipped.' : 'Nothing flagged.';
    els.main.append(p);
    return;
  }
  const list = document.createElement('div');
  list.className = 'steps';
  for (const i of indices) list.append(renderRow(state.flat[i].step, { caption: state.flat[i].section.title }));
  els.main.append(list);
}

function renderBottomBar() {
  const n = state.skipped.length;
  els.skipped.hidden = n === 0;
  els.skippedCount.textContent = `(${n})`;
  const pastEnd = state.currentIndex >= state.flat.length;
  els.cont.textContent = state.complete ? 'Complete' : pastEnd ? 'Go to skipped' : 'Continue';
  els.cont.disabled = state.complete;
}

function refreshSectionCounts() {
  for (const det of els.main.querySelectorAll('details.section')) {
    const section = game.sections.find((s) => s.id === det.dataset.id);
    const sp = sectionProgress(section, progress, { hideSide: !!ui.hideSide });
    det.querySelector('.s-count').textContent = `${sp.done}/${sp.total}`;
  }
}

// ---------- changes ----------
function toggleDone(step) {
  if (progress.done[step.id]) delete progress.done[step.id]; else progress.done[step.id] = Date.now();
  saveProgress();
  afterProgressChange([step.id]);
}

function afterProgressChange(changedIds) {
  const prevCurrent = state.flat[state.currentIndex]?.step.id;
  recompute();
  if (view !== 'all') { renderAll(); return; }
  const ids = new Set(changedIds);
  const newCurrent = state.flat[state.currentIndex]?.step.id;
  if (prevCurrent) ids.add(prevCurrent);
  if (newCurrent) ids.add(newCurrent);
  for (const id of ids) refreshRow(id);
  renderCounters();
  refreshSectionCounts();
  renderBottomBar();
  // Finishing a section leaves the next step inside a closed one, where the
  // player would see nothing happen. Open it and go there.
  if (newCurrent && !els.main.querySelector(`.row[data-id="${newCurrent}"]`)) scrollToCurrent(false);
}

function refreshRow(id) {
  const old = els.main.querySelector(`.row[data-id="${id}"]`);
  const i = state.index.get(id);
  if (!old || i === undefined) return;
  old.replaceWith(renderRow(state.flat[i].step));
}

// Opening the app must land on the current step. An animation frame is not
// enough on its own: a backgrounded tab never runs one, so try again on load
// and when the page becomes visible, and stop as soon as it worked.
let viewPlaced = false;
function placeViewOnCurrent() {
  if (viewPlaced) return;
  viewPlaced = scrollToCurrent(false);
  if (viewPlaced) return;
  requestAnimationFrame(() => placeViewOnCurrent());
  setTimeout(placeViewOnCurrent, 0);
  window.addEventListener('load', placeViewOnCurrent, { once: true });
  document.addEventListener('visibilitychange', function onVis() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVis);
    placeViewOnCurrent();
  });
}

function scrollToCurrent(smooth = true) {
  if (view !== 'all') { view = 'all'; renderAll(); }
  // Past the last step, "next" is whatever was skipped along the way.
  const cur = state.flat[state.currentIndex] ?? state.flat[state.skipped[0]];
  if (!cur) return false;
  const det = els.main.querySelector(`details.section[data-id="${cur.section.id}"]`);
  if (det) {
    if (!det.open) { det.dataset.state = 'open'; det.open = true; }
    fillSection(det, game.sections.find((s) => s.id === cur.section.id));
  }
  const row = els.main.querySelector(`.row[data-id="${cur.step.id}"]`);
  if (!row) return false;
  // Smooth scrolling across thousands of steps is a long slow ride; jump instead.
  const far = Math.abs(row.getBoundingClientRect().top) > window.innerHeight * 2;
  row.scrollIntoView({ block: 'center', behavior: smooth && !far ? 'smooth' : 'auto' });
  return true;
}

function wireBottomBar() {
  els.cont.onclick = () => scrollToCurrent(true);
  els.skipped.onclick = () => { view = view === 'skipped' ? 'all' : 'skipped'; renderAll(); window.scrollTo(0, 0); };
  els.menu.onclick = () => openMenu();
}

// ---------- notices ----------
function notice(text, { id, error = false, onDismiss } = {}) {
  if (id && els.notices.querySelector(`[data-id="${CSS.escape(id)}"]`)) return;
  const el = document.createElement('div');
  el.className = `notice${error ? ' error' : ''}`;
  if (id) el.dataset.id = id;
  el.innerHTML = `<p>${esc(text)}</p><button class="dismiss" aria-label="Dismiss">×</button>`;
  el.querySelector('.dismiss').onclick = () => { el.remove(); onDismiss?.(); measureHeader(); };
  els.notices.append(el);
}

function fatal(text) {
  els.main.innerHTML = `<div class="fatal">${esc(text)}</div>`;
  els.cont.disabled = true;
}

function maybeInstallHint() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone || store.read('zt:installHintDismissed')) return;
  notice('Add this page to your Home Screen (Share → Add to Home Screen). Installed, it works offline and Safari keeps your progress.', {
    id: 'install', onDismiss: () => store.write('zt:installHintDismissed', '1'),
  });
}

// ---------- sheets ----------
function openSheet(html) {
  els.sheet.innerHTML = `<div class="backdrop"></div><div class="panel">${html}</div>`;
  els.sheet.hidden = false;
  document.body.classList.add('sheet-open');
  return els.sheet.querySelector('.panel');
}
function closeSheet() {
  els.sheet.hidden = true;
  els.sheet.innerHTML = '';
  document.body.classList.remove('sheet-open');
}

function openStepSheet(step) {
  const note = progress.notes[step.id] ?? '';
  const flag = progress.flags[step.id];
  const panel = openSheet(`
    <h2>${esc(step.text)}</h2>
    ${step.detail ? `<p class="sheet-detail">${esc(step.detail)}</p>` : ''}
    <label>Note<textarea id="f-note" rows="2" placeholder="e.g. suspend slot 2 saved here">${esc(note)}</textarea></label>
    <label class="check-line"><input type="checkbox" id="f-flag" ${flag !== undefined ? 'checked' : ''}> This step was wrong or unclear</label>
    <label id="f-flag-wrap" ${flag === undefined ? 'hidden' : ''}>What was wrong<textarea id="f-flag-text" rows="2">${esc(flag ?? '')}</textarea></label>
    <button class="primary" id="f-done">Done</button>`);
  const flagBox = panel.querySelector('#f-flag');
  const wrap = panel.querySelector('#f-flag-wrap');
  flagBox.onchange = () => { wrap.hidden = !flagBox.checked; };
  const save = () => {
    const n = panel.querySelector('#f-note').value.trim();
    if (n) progress.notes[step.id] = n; else delete progress.notes[step.id];
    if (flagBox.checked) progress.flags[step.id] = panel.querySelector('#f-flag-text').value.trim();
    else delete progress.flags[step.id];
    saveProgress();
    closeSheet();
    afterProgressChange([step.id]);
  };
  panel.querySelector('#f-done').onclick = save;
  els.sheet.querySelector('.backdrop').onclick = save;
}

function openMenu() {
  const panel = openSheet(`
    <label class="check-line"><input type="checkbox" id="m-hide-side" ${ui.hideSide ? 'checked' : ''}> Main route only</label>
    <p class="sheet-detail">Hides the ${state.sideTotal} optional steps: collectibles, side quests and upgrades. Their progress is kept.</p>
    <button class="menu-item" id="m-flagged"><span>Flagged</span><span class="count">${state.flagged.length}</span></button>
    <button class="menu-item" id="m-backup"><span>Backup progress</span><span class="count">›</span></button>
    <button class="menu-item" id="m-import"><span>Import progress</span><span class="count">›</span></button>
    <div class="about">Zelda 100% v${APP_VERSION} · content v${game.contentVersion ?? '?'} · ${state.flat.length} steps</div>`);
  els.sheet.querySelector('.backdrop').onclick = closeSheet;
  panel.querySelector('#m-hide-side').onchange = (e) => {
    ui.hideSide = e.target.checked;
    saveUi();
    closeSheet();
    recompute();
    renderAll();
    scrollToCurrent(false);
  };
  panel.querySelector('#m-flagged').onclick = () => { closeSheet(); view = 'flagged'; renderAll(); window.scrollTo(0, 0); };
  panel.querySelector('#m-backup').onclick = openBackup;
  panel.querySelector('#m-import').onclick = openImport;
}

function openBackup() {
  const text = serializeProgress(progress);
  const doneCount = Object.keys(progress.done).length;
  const canShare = typeof navigator.share === 'function';
  const panel = openSheet(`
    <h2>Backup progress</h2>
    <p class="sheet-detail">${doneCount} steps done. Keep this text somewhere safe (Notes, a message to yourself). Import it on any phone to restore.</p>
    <div class="row-actions">${canShare ? '<button id="b-share">Share</button>' : ''}<button id="b-copy">Copy</button></div>
    <label>Progress JSON<textarea id="b-text" rows="6" readonly>${esc(text)}</textarea></label>
    <div class="msg" id="b-msg"></div>
    <button class="primary" id="b-close">Close</button>`);
  els.sheet.querySelector('.backdrop').onclick = closeSheet;
  panel.querySelector('#b-close').onclick = closeSheet;
  const msg = panel.querySelector('#b-msg');
  panel.querySelector('#b-share')?.addEventListener('click', async () => {
    try { await navigator.share({ title: `Zelda 100% progress (${game.title})`, text }); msg.textContent = 'Shared.'; }
    catch { /* user cancelled */ }
  });
  panel.querySelector('#b-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(text); msg.textContent = 'Copied to clipboard.'; }
    catch {
      const ta = panel.querySelector('#b-text'); ta.focus(); ta.select();
      msg.textContent = 'Select the text above and copy it.';
    }
  };
}

function openImport() {
  const panel = openSheet(`
    <h2>Import progress</h2>
    <p class="sheet-detail">Paste a backup. It is merged into what is on this phone: nothing already checked is lost. The current progress is copied to a backup key first.</p>
    <label>Backup JSON<textarea id="i-text" rows="6" placeholder='{"schemaVersion":1,...}'></textarea></label>
    <div class="msg" id="i-msg"></div>
    <button class="primary" id="i-go">Import</button>`);
  els.sheet.querySelector('.backdrop').onclick = closeSheet;
  const msg = panel.querySelector('#i-msg');
  panel.querySelector('#i-go').onclick = () => {
    const res = parseProgress(panel.querySelector('#i-text').value.trim(), gameId);
    if (!res.ok) { msg.className = 'msg error'; msg.textContent = `Not a valid backup for this game (${res.reason}).`; return; }
    store.write(`zt:progress:${gameId}:backup:${Date.now()}`, JSON.stringify(progress));
    progress = mergeProgress(progress, res.progress, Date.now());
    saveProgress();
    recompute();
    closeSheet();
    view = 'all';
    renderAll();
    notice(`Imported. ${Object.keys(progress.done).length} steps done.`, { id: `import-${Date.now()}` });
  };
}

boot();
