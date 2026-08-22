import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectDetail() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('=== USERS IN DETAIL ===');
  const u = await client.query(`
    SELECT u.id, u.email, u.created_at, p.first_name, p.last_name, p.phone,
      (SELECT count(*) FROM mcq_attempts a WHERE a.user_id = u.id) as attempts,
      (SELECT count(*) FROM study_plans s WHERE s.user_id = u.id) as plans,
      (SELECT count(*) FROM study_preferences sp WHERE sp.user_id = u.id) as prefs,
      (SELECT count(*) FROM user_exams ue WHERE ue.user_id = u.id) as exams
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.auth_user_id OR u.id = p.id
    ORDER BY u.created_at;
  `);
  console.table(u.rows);

  console.log('=== MCQS DETAIL ===');
  const mcqs = await client.query(`
    SELECT id, question, ai_generated, source, created_at, status, slug
    FROM mcqs
    ORDER BY created_at;
  `);
  for (const m of mcqs.rows) {
    console.log(`[MCQ ${m.id}] slug: ${m.slug} | AI: ${m.ai_generated} | Source: ${m.source} | Created: ${m.created_at}`);
    console.log(`  Question: ${m.question.substring(0, 100)}...`);
  }

  console.log('=== NOTES DETAIL ===');
  const n = await client.query(`SELECT id, title, note_type, author_source, ai_generated, created_at FROM notes`);
  for (const row of n.rows) {
    console.log(`[NOTE ${row.id}] title: ${row.title} | AI: ${row.ai_generated} | Source: ${row.author_source}`);
  }

  console.log('=== PAYMENT EVENTS DETAIL ===');
  const pe = await client.query(`SELECT * FROM payment_events`);
  console.table(pe.rows);

  await client.end();
}

inspectDetail().catch(console.error);
