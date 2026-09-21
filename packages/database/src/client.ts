import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

export type Database = NodePgDatabase<typeof schema>;

let pool: pg.Pool | null = null;
let db: Database | null = null;

export function getDbPool(databaseUrl?: string): pg.Pool {
  if (!pool) {
    const connectionString =
      databaseUrl ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgrespassword@localhost:5432/vidsnapai';

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err);
    });

  }
  return pool;
}

export function getDatabase(databaseUrl?: string): Database {
  if (!db) {
    const activePool = getDbPool(databaseUrl);
    db = drizzle(activePool, { schema });
  }
  return db;
}

export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const activePool = getDbPool();
    const client = await activePool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - start;
      return { status: 'healthy', latencyMs };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'unhealthy', latencyMs, error: message };
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
