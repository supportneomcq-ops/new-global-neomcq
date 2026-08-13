import pg from 'pg';
const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function checkMcqConstraints() {
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'public.mcqs'::regclass AND conname = 'mcqs_status_check';
  `);
  console.log('mcqs_status_check def:', res.rows[0]?.pg_get_constraintdef);

  await client.end();
}
checkMcqConstraints().catch(console.error);
