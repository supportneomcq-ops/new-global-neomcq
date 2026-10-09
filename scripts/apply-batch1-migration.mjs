import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Client } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function applyBatch1() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    throw new Error("Missing POSTGRES_URL environment variable.");
  }
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log("Connected to PostgreSQL database successfully.");

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/034_batch1_security_foundation.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log("Applying Migration 034_batch1_security_foundation.sql...");
  await client.query('BEGIN;');
  try {
    await client.query(sql);
    await client.query('COMMIT;');
    console.log("✓ Migration 034_batch1_security_foundation.sql successfully applied and committed!");
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error("❌ Migration failed, rolled back:", err);
    throw err;
  }

  await client.end();
}

applyBatch1().catch(err => {
  console.error(err);
  process.exit(1);
});
