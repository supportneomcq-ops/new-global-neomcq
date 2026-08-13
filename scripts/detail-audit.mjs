import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

const client = new Client({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;`);
  console.log('TABLES:', tables.rows.map(r => r.table_name).join(', '));

  const funcs = await client.query(`
    SELECT proname, prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' ORDER BY proname;
  `);
  console.log('FUNCTIONS:', funcs.rows.map(r => `${r.proname}${r.prosecdef ? '(secdef)' : ''}`).join(', '));

  const triggers = await client.query(`
    SELECT event_object_table, trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY event_object_table;
  `);
  console.log('TRIGGERS:', JSON.stringify(triggers.rows, null, 2));

  await client.end();
}
run();
