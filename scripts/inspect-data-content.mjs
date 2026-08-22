import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectContent() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('=== DETAILED DATA CONTENT AUDIT ===');

  // 1. Auth users & profiles
  const usersRes = await client.query(`
    SELECT u.id, u.email, u.created_at, p.id as profile_id, p.first_name, p.last_name, p.phone,
           (SELECT string_agg(r.name, ', ') FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = p.id) as roles
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.auth_user_id OR u.id = p.id
    ORDER BY u.created_at ASC;
  `);
  console.log('\n--- AUTH USERS & PROFILES ---');
  console.table(usersRes.rows);

  // 2. MCQs
  const mcqsRes = await client.query(`
    SELECT m.id, m.question, m.difficulty, m.status, m.ai_generated, m.source, m.slug, m.created_at,
           e.name as exam_name, s.name as subject_name, t.name as topic_name
    FROM mcqs m
    LEFT JOIN exams e ON m.exam_id = e.id
    LEFT JOIN exam_subjects s ON m.subject_id = s.id
    LEFT JOIN exam_topics t ON m.topic_id = t.id
    ORDER BY m.created_at ASC;
  `);
  console.log(`\n--- ALL MCQS (${mcqsRes.rows.length}) ---`);
  console.table(mcqsRes.rows.map(m => ({
    id: m.id,
    question: m.question ? m.question.substring(0, 45) + '...' : 'NULL',
    exam: m.exam_name,
    subject: m.subject_name,
    topic: m.topic_name,
    status: m.status,
    ai: m.ai_generated,
    slug: m.slug,
    created_at: m.created_at
  })));

  // 3. Notes
  const notesRes = await client.query(`
    SELECT n.id, n.title, n.note_type, n.status, n.ai_generated, n.author_source, n.created_at,
           e.name as exam_name, s.name as subject_name, t.name as topic_name
    FROM notes n
    LEFT JOIN exams e ON n.exam_id = e.id
    LEFT JOIN exam_subjects s ON n.subject_id = s.id
    LEFT JOIN exam_topics t ON n.topic_id = t.id
    ORDER BY n.created_at ASC;
  `);
  console.log(`\n--- ALL NOTES (${notesRes.rows.length}) ---`);
  console.table(notesRes.rows);

  // 4. mcq_attempts
  const attemptsRes = await client.query(`SELECT * FROM mcq_attempts`);
  console.log(`\n--- MCQ ATTEMPTS (${attemptsRes.rows.length}) ---`);
  console.table(attemptsRes.rows);

  // 5. payment_events & payments
  const paymentEventsRes = await client.query(`SELECT id, provider, event_type, status, received_at FROM payment_events`);
  console.log(`\n--- PAYMENT EVENTS (${paymentEventsRes.rows.length}) ---`);
  console.table(paymentEventsRes.rows);

  // 6. credit_ledger
  const creditLedgerRes = await client.query(`SELECT * FROM credit_ledger`);
  console.log(`\n--- CREDIT LEDGER (${creditLedgerRes.rows.length}) ---`);
  console.table(creditLedgerRes.rows);

  // 7. study_plans & study_preferences
  const studyPlansRes = await client.query(`SELECT * FROM study_plans`);
  console.log(`\n--- STUDY PLANS (${studyPlansRes.rows.length}) ---`);
  console.table(studyPlansRes.rows);

  const studyPrefsRes = await client.query(`SELECT * FROM study_preferences`);
  console.log(`\n--- STUDY PREFERENCES (${studyPrefsRes.rows.length}) ---`);
  console.table(studyPrefsRes.rows);

  // 8. system_settings
  const settingsRes = await client.query(`SELECT key, value FROM system_settings`);
  console.log(`\n--- SYSTEM SETTINGS (${settingsRes.rows.length}) ---`);
  console.table(settingsRes.rows);

  // 9. Check codebase mock files or references
  await client.end();
}

inspectContent().catch(console.error);
