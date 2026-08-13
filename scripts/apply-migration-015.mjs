import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

const client = new Client({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  await client.connect();
  console.log('Connected to remote database. Applying Migration 015...');

  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '015_forensic_backend_completion.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await client.query(sql);
  console.log('Migration 015 applied successfully!');

  // Verify created tables and RPCs
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('payment_events', 'ai_jobs', 'audit_logs', 'exam_aliases', 'subject_aliases', 'topic_aliases');
  `);
  console.log('Verified Tables:', tables.rows.map(r => r.table_name));

  const funcs = await client.query(`
    SELECT proname 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
      AND proname IN ('credit_reserve', 'credit_consume', 'credit_release', 'credit_adjust', 'record_payment_event', 'get_admin_analytics_summary', 'resolve_exam_alias');
  `);
  console.log('Verified RPCs:', funcs.rows.map(r => r.proname));

  await client.end();
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
