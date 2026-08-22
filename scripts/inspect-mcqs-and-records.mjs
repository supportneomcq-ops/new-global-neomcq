import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectRecords() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('=== USERS ===');
  const u = await client.query(`SELECT id, email, created_at, raw_user_meta_data FROM auth.users ORDER BY created_at`);
  console.table(u.rows);

  console.log('=== PROFILES ===');
  const p = await client.query(`SELECT id, auth_user_id, email, first_name, last_name, phone, created_at FROM profiles ORDER BY created_at`);
  console.table(p.rows);

  console.log('=== MCQS ===');
  const mcqs = await client.query(`
    SELECT id, question, options, correct_answer, explanation, difficulty, ai_generated, source, slug, created_at
    FROM mcqs
    ORDER BY created_at
  `);
  console.table(mcqs.rows.map(m => ({
    id: m.id,
    slug: m.slug,
    q: m.question.substring(0, 50),
    ai: m.ai_generated,
    src: m.source,
    created_at: m.created_at
  })));

  console.log('=== NOTES ===');
  const n = await client.query(`SELECT id, title, note_type, author_source, ai_generated, created_at FROM notes ORDER BY created_at`);
  console.table(n.rows);

  console.log('=== MCQ ATTEMPTS ===');
  const att = await client.query(`SELECT * FROM mcq_attempts`);
  console.table(att.rows);

  console.log('=== PAYMENT EVENTS ===');
  const pe = await client.query(`SELECT * FROM payment_events`);
  console.table(pe.rows);

  console.log('=== CREDIT LEDGER ===');
  const cl = await client.query(`SELECT * FROM credit_ledger`);
  console.table(cl.rows);

  await client.end();
}

inspectRecords().catch(console.error);
