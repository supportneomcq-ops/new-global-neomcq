import pg from 'pg';
const { Client } = pg;

async function run() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    console.error("No POSTGRES_URL");
    return;
  }
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected to PostgreSQL via POSTGRES_URL!");

  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("ALL_TABLES:", JSON.stringify(tables.rows.map(r => r.table_name)));

  const aiJobsCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_jobs'
    ORDER BY ordinal_position;
  `);
  console.log("AI_JOBS_COLS:", JSON.stringify(aiJobsCols.rows));

  const auditLogsCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ORDER BY ordinal_position;
  `);
  console.log("AUDIT_LOGS_COLS:", JSON.stringify(auditLogsCols.rows));

  const fks = await client.query(`
    SELECT
      tc.table_name, kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('audit_logs', 'ai_jobs');
  `);
  console.log("FKS:", JSON.stringify(fks.rows));

  await client.end();
}

run().catch(console.error);
