import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
if (!rawUrl) {
  console.error('Error: POSTGRES_URL environment variable is missing.');
  process.exit(1);
}

// Clean and prepare the Postgres connection URL
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

const client = new Client({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  await client.connect();
  console.log('Connected to remote database. Applying Migration 022 (Global Exam Intelligence Database Foundation)...');

  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '022_global_exam_intelligence_database.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await client.query(sql);
  console.log('Migration 022 applied successfully!');

  // Verify created tables
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('exam_subtopics', 'exam_evidence');
  `);
  console.log('Verified Tables:', tables.rows.map(r => r.table_name));

  // Verify added columns on existing tables
  const columnsExams = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'exams' 
      AND column_name IN ('normalized_name', 'authority', 'exam_type', 'verification_status');
  `);
  console.log('Verified added columns on exams:', columnsExams.rows.map(r => r.column_name));

  await client.end();
}

applyMigration().catch(err => {
  console.error('Migration 022 failed:', err);
  process.exit(1);
});
