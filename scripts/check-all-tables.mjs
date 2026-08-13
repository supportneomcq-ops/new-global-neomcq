import pg from 'pg';
const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function checkAllTables() {
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('=== PUBLIC TABLES ===');
  console.log(tables.rows.map(r => r.table_name).join(', '));

  await client.end();
}
checkAllTables().catch(console.error);
