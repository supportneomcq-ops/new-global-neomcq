import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function runMigration() {
  console.log('Running Migration 016...');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const sql = fs.readFileSync('./supabase/migrations/016_production_hardening_and_sec_seo.sql', 'utf8');
  await client.query(sql);

  console.log('Successfully applied Migration 016!');
  await client.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
