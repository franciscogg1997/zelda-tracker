#!/usr/bin/env node
// One-time content assembly.
// Usage: node tools/merge.mjs data/parts/header.json data/parts/*.json > data/oot.json
// The first file supplies id/title/platform/contentVersion/counters; every file's sections are appended in argv order.
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length < 2) { console.error('usage: node tools/merge.mjs header.json part1.json part2.json ...'); process.exit(2); }
const header = JSON.parse(readFileSync(files[0], 'utf8'));
const out = { id: header.id, title: header.title, platform: header.platform, contentVersion: header.contentVersion, counters: header.counters, sections: [] };
for (const f of files.slice(1)) {
  const part = JSON.parse(readFileSync(f, 'utf8'));
  if (!Array.isArray(part.sections)) { console.error(`${f}: no sections array`); process.exit(1); }
  out.sections.push(...part.sections);
}
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
