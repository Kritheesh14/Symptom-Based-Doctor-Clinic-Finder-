import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { required } from './config';

// bigint (count(*)) -> number; timestamp / date stay as plain strings (no timezone surprises)
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1114, (v) => v);
types.setTypeParser(1082, (v) => v);

const g = globalThis as unknown as { __pgPool?: Pool };

function pool(): Pool {
  if (!g.__pgPool) {
    g.__pgPool = new Pool({ connectionString: required('DATABASE_URL'), max: 10 });
  }
  return g.__pgPool;
}

/** Parameterized query: values are never concatenated into the SQL text. */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params as never[]);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (g.__pgPool) {
    await g.__pgPool.end();
    g.__pgPool = undefined;
  }
}
