import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbPool, closeDatabase } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const pool = getDbPool();
  const migrationsFolder = path.resolve(__dirname, '../../../infrastructure/migrations');
  console.log(`[Migrations] Scanning migrations from: ${migrationsFolder}`);

  if (!fs.existsSync(migrationsFolder)) {
    throw new Error(`Migrations folder not found: ${migrationsFolder}`);
  }

  const client = await pool.connect();
  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__vidsnapai_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "applied_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const res = await client.query<{ name: string }>(`SELECT "name" FROM "__vidsnapai_migrations"`);
    const appliedSet = new Set(res.rows.map((r) => r.name));

    // 3. Read migration SQL files in order
    const files = fs
      .readdirSync(migrationsFolder)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`[Migrations] Found ${files.length} migration files in folder.`);

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migrations] Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`[Migrations] Applying migration: ${file}...`);
      const filePath = path.join(migrationsFolder, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute statements within transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO "__vidsnapai_migrations" ("name") VALUES ($1)`, [file]);
        await client.query('COMMIT');
        console.log(`[Migrations] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrations] Error applying migration ${file}:`, err);
        throw err;
      }
    }

    console.log('[Migrations] All migrations completed successfully.');
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[Migrations] Done.');
      return closeDatabase();
    })
    .catch((err) => {
      console.error('[Migrations] Migration failed:', err);
      process.exit(1);
    });
}
