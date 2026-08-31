import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
if (!rawUrl) {
  console.error('Error: POSTGRES_URL environment variable is missing.');
  process.exit(1);
}

const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

const client = new Client({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  await client.connect();
  console.log('Connected to database. Applying Migration 024 (AI Tutor Foundation)...');

  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '024_ai_tutor_foundation.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await client.query(sql);
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log('Migration 024 applied and PostgREST schema reloaded successfully!');

  // Verify added columns
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_lessons';
  `);
  console.log('Columns in ai_tutor_lessons:', cols.rows.map(r => r.column_name));

  await client.end();
}

applyMigration().catch(err => {
  console.error('Migration 024 failed:', err);
  process.exit(1);
});
