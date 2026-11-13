import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { closePool, query } from '@/lib/db';
import { CASES, VECTOR_SIZE, qdrant } from '@/lib/vector/client';
import { embed } from '@/lib/vector/embed';

type Row = { text: string; speciality_name: string };

/** Deterministic UUID from the text so re-running the ingest does not create duplicates. */
function pointId(text: string): string {
  const h = createHash('sha1').update(`seed:${text}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

async function main() {
  const reset = process.argv.includes('--reset');
  const rows: Row[] = JSON.parse(readFileSync(path.resolve(process.cwd(), '../vector/corpus.json'), 'utf8'));

  // One SQL query resolves every speciality name to its id.
  const specs = await query<{ speciality_id: number; speciality_name: string }>('SELECT speciality_id, speciality_name FROM specialities');
  const idByName = new Map(specs.map((s) => [s.speciality_name, s.speciality_id]));
  const unknown = [...new Set(rows.map((r) => r.speciality_name).filter((n) => !idByName.has(n)))];
  if (unknown.length) throw new Error(`Unknown speciality names in corpus: ${unknown.join(', ')} (is the database seeded?)`);

  const client = qdrant();
  if (reset) {
    await client.deleteCollection(CASES);
    await client.createCollection(CASES, { vectors: { size: VECTOR_SIZE, distance: 'Cosine' } });
    await client.createPayloadIndex(CASES, { field_name: 'speciality_id', field_schema: 'integer', wait: true });
    await client.createPayloadIndex(CASES, { field_name: 'source', field_schema: 'keyword', wait: true });
    console.log(`recreated ${CASES}`);
  }

  const BATCH = 32;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const points = [];
    for (const r of chunk) {
      points.push({
        id: pointId(r.text),
        vector: await embed(r.text),
        payload: {
          text: r.text,
          speciality_id: idByName.get(r.speciality_name)!,
          speciality_name: r.speciality_name,
          source: 'seed',
          created_at: new Date().toISOString(),
        },
      });
    }
    await client.upsert(CASES, { wait: true, points });
    console.log(`upserted ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }
  await closePool();
}

main().catch((e) => { console.error(e); process.exit(1); });
