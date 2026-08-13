import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl ? rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify') : null;

async function runMigration() {
  if (!cleanUrl) {
    throw new Error('POSTGRES_URL environment variable is missing.');
  }
  console.log('Running Migration 017...');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const sql = fs.readFileSync('./supabase/migrations/017_default_user_role.sql', 'utf8');
  await client.query(sql);

  console.log('Successfully applied Migration 017!');
  await client.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
