import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function comprehensiveAudit() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log('=== TABLE ROW COUNTS ===');
  const tableCounts = [];
  for (const row of tablesRes.rows) {
    const t = row.table_name;
    const countRes = await client.query(`SELECT count(*) FROM "${t}"`);
    tableCounts.push({ table: t, count: parseInt(countRes.rows[0].count, 10) });
  }
  console.table(tableCounts);

  const authUsers = await client.query(`SELECT id, email, created_at FROM auth.users ORDER BY created_at`);
  console.log('=== AUTH USERS ===');
  console.table(authUsers.rows);

  const profiles = await client.query(`SELECT id, auth_user_id, email, first_name, last_name, phone, created_at FROM profiles ORDER BY created_at`);
  console.log('=== PROFILES ===');
  console.table(profiles.rows);

  await client.end();
}

comprehensiveAudit().catch(console.error);
