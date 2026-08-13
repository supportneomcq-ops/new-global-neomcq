import pg from 'pg';
const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function checkMcqSchema() {
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const mcqCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'mcqs' 
    ORDER BY ordinal_position;
  `);
  console.log('=== MCQS TABLE COLUMNS ===');
  console.table(mcqCols.rows);

  const mcqAttemptsCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'mcq_attempts' 
    ORDER BY ordinal_position;
  `);
  console.log('=== MCQ_ATTEMPTS TABLE COLUMNS ===');
  console.table(mcqAttemptsCols.rows);

  await client.end();
}
checkMcqSchema().catch(console.error);
