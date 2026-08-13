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

  const authTriggers = await client.query(`
    SELECT trigger_name, event_manipulation, event_object_schema, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'users';
  `);
  console.log('AUTH TRIGGERS:', JSON.stringify(authTriggers.rows, null, 2));

  await client.end();
}
run();
