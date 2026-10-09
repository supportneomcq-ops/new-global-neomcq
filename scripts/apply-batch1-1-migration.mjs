import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Client } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function applyBatch1_1() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    throw new Error("Missing POSTGRES_URL environment variable.");
  }
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log("Connected to PostgreSQL database.");

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/035_batch1_1_public_schema_hardening.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log("Applying Migration 035_batch1_1_public_schema_hardening.sql...");
  await client.query('BEGIN;');
  try {
    await client.query(sql);
    await client.query('COMMIT;');
    console.log("✓ Migration 035_batch1_1_public_schema_hardening.sql successfully applied and committed!");
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error("❌ Migration 035 failed, rolled back:", err);
    throw err;
  }

  await client.end();
}

applyBatch1_1().catch(err => {
  console.error(err);
  process.exit(1);
});
