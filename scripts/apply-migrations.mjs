import fs from 'fs';
import path from 'path';
import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function applyMigrations() {
  const url = new URL(process.env.POSTGRES_URL);
  url.searchParams.delete('sslmode');
  
  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Postgres successfully.');

  const migrationsToRun = [
    '018_exam_lock_and_paid_switch.sql',
    '019_topic_access_refresh_and_append.sql',
    '023_safe_curriculum_canonicalization.sql',
    '025_curriculum_intelligence_subtopics.sql',
    '026_quiz_true_simulation.sql',
  ];

  for (const mig of migrationsToRun) {
    const filePath = path.join(process.cwd(), 'supabase/migrations', mig);
    if (!fs.existsSync(filePath)) {
      console.log(`Migration file ${mig} not found, skipping.`);
      continue;
    }
    console.log(`Applying ${mig}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log(`✓ Successfully applied ${mig}`);
    } catch (err) {
      console.error(`Error applying ${mig}:`, err.message);
    }
  }

  // Verify profiles columns
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position;
  `);
  console.log('Updated Profiles Columns:', res.rows.map(r => r.column_name));

  await client.end();
}

applyMigrations().catch(console.error);
