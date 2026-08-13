import pg from 'pg';
const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function checkCols() {
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'study_sessions';
  `);
  console.log('study_sessions columns:', res.rows.map(r => r.column_name));
  await client.end();
}
checkCols();
