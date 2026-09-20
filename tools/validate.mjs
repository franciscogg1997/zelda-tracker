#!/usr/bin/env node
// Usage: node tools/validate.mjs data/oot.json [--partial] [--quiet]
import { readFileSync } from 'node:fs';
import { validateGame } from '../logic.js';

const args = process.argv.slice(2);
const partial = args.includes('--partial');
const quiet = args.includes('--quiet');
const files = args.filter((a) => !a.startsWith('--'));
if (files.length === 0) { console.error('usage: node tools/validate.mjs <file.json> [--partial]'); process.exit(2); }

let failed = false;
for (const file of files) {
  let game;
  try { game = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.error(`${file}: cannot parse JSON: ${e.message}`); failed = true; continue; }
  const { errors, warnings, summary } = validateGame(game, { partial });
  if (!quiet) {
    console.log(`\n${file}: ${summary.steps} steps in ${summary.sections.length} sections`);
    for (const s of summary.sections) console.log(`  ${String(s.steps).padStart(4)}  ${s.id} — ${s.title}`);
    console.log('  counters:');
    for (const c of summary.counters) console.log(`    ${c.id.padEnd(10)} ${c.seen}/${c.total}`);
    if (summary.missables.length) {
      console.log('  missables:');
      for (const m of summary.missables) console.log(`    ${m.id}: ${m.text}`);
    }
  }
  for (const w of warnings) console.log(`  warning: ${w}`);
  for (const e of errors) console.error(`  ERROR: ${e}`);
  if (errors.length) failed = true;
  else console.log(`  OK${partial ? ' (partial)' : ''}`);
}
process.exit(failed ? 1 : 0);
