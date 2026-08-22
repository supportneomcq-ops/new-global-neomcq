import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectExactSchema() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log('=== ALL TABLES & ROW COUNTS ===');
  for (const t of tablesRes.rows) {
    const tableName = t.table_name;
    const countRes = await client.query(`SELECT count(*) as c FROM "${tableName}"`);
    console.log(`${tableName}: ${countRes.rows[0].c}`);
  }

  console.log('\n=== COLUMNS FOR KEY TABLES ===');
  const colsRes = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `);
  
  const tableCols = {};
  for (const row of colsRes.rows) {
    if (!tableCols[row.table_name]) tableCols[row.table_name] = [];
    tableCols[row.table_name].push(row.column_name);
  }

  for (const [t, cols] of Object.entries(tableCols)) {
    console.log(`\nTable [${t}]: ${cols.join(', ')}`);
  }

  await client.end();
}

inspectExactSchema().catch(console.error);
