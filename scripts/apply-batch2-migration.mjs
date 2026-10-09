import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    console.error('POSTGRES_URL is not set.');
    process.exit(1);
  }

  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new pg.Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    const migrationPath = path.resolve(__dirname, '../supabase/migrations/036_batch2_ai_generation_idempotency.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing Migration 036 (Batch 2)...');
    await client.query(sql);
    console.log('Migration 036 executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
