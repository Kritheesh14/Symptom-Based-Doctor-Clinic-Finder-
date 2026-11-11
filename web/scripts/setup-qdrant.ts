import { CASES, QUERIES, VECTOR_SIZE, qdrant } from '@/lib/vector/client';
 
type Index = { field: string; schema: 'integer' | 'keyword' | 'datetime' };
 
const COLLECTIONS: { name: string; indexes: Index[] }[] = [
  {
    name: CASES,
    indexes: [
      { field: 'speciality_id', schema: 'integer' },
      { field: 'source', schema: 'keyword' },
    ],
  },
  {
    name: QUERIES,
    indexes: [
      { field: 'patient_id', schema: 'integer' },
      { field: 'speciality_id', schema: 'integer' },
      { field: 'appointment_id', schema: 'integer' },
    ],
  },
];
 
async function main() {
  const client = qdrant();
  for (const c of COLLECTIONS) {
    const { exists } = await client.collectionExists(c.name);
    if (!exists) {
      await client.createCollection(c.name, { vectors: { size: VECTOR_SIZE, distance: 'Cosine' } });
      console.log(`created collection ${c.name} (${VECTOR_SIZE}-d, Cosine)`);
    } else {
      console.log(`collection ${c.name} already exists`);
    }
    for (const idx of c.indexes) {
      await client.createPayloadIndex(c.name, { field_name: idx.field, field_schema: idx.schema, wait: true });
      console.log(`  payload index ${c.name}.${idx.field} (${idx.schema})`);
    }
  }
}
 
main().catch((e) => { console.error(e); process.exit(1); });
