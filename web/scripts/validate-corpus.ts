import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SPECIALITY_NAMES } from '@/lib/constants';

type Row = { text: string; speciality_name: string };
const load = (f: string): Row[] => JSON.parse(readFileSync(path.resolve(process.cwd(), '../vector', f), 'utf8'));

let failed = false;
function check(file: string, minPerSpeciality: number) {
  const rows = load(file);
  const counts = new Map<string, number>(SPECIALITY_NAMES.map((n) => [n, 0]));
  for (const r of rows) {
    if (!r.text || r.text.trim().length < 10) { console.error(`${file}: text too short: "${r.text}"`); failed = true; }
    if (!counts.has(r.speciality_name)) { console.error(`${file}: invalid label "${r.speciality_name}"`); failed = true; continue; }
    counts.set(r.speciality_name, counts.get(r.speciality_name)! + 1);
  }
  const dupes = rows.length - new Set(rows.map((r) => r.text.toLowerCase())).size;
  if (dupes) { console.error(`${file}: ${dupes} duplicate texts`); failed = true; }
  console.log(`\n${file}: ${rows.length} cases`);
  for (const [name, n] of counts) {
    console.log(`  ${name.padEnd(18)} ${n}`);
    if (n < minPerSpeciality) { console.error(`  -> ${name} has fewer than ${minPerSpeciality}`); failed = true; }
  }
}

check('corpus.json', 15);
check('eval.json', 3);

// the evaluation set must not contain exact corpus lines
const corpus = new Set(load('corpus.json').map((r) => r.text.toLowerCase()));
const leaked = load('eval.json').filter((r) => corpus.has(r.text.toLowerCase()));
if (leaked.length) { console.error(`eval.json contains ${leaked.length} corpus lines`); failed = true; }

console.log(failed ? '\nFAILED' : '\nOK');
process.exit(failed ? 1 : 0);
