import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;

async function auditData() {
  if (!rawUrl) {
    console.log('No POSTGRES_URL in environment. Using Supabase JS client instead...');
    return;
  }
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('=== DATABASE DATA AUDIT ===');

  // List all tables in public schema and their row counts
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log('\n--- ROW COUNTS ---');
  for (const row of tables.rows) {
    const tableName = row.table_name;
    try {
      const countRes = await client.query(`SELECT count(*) as c FROM "${tableName}"`);
      console.log(`${tableName}: ${countRes.rows[0].c}`);
    } catch (e) {
      console.log(`${tableName}: Error reading count - ${e.message}`);
    }
  }

  // Check auth.users
  try {
    const authUsers = await client.query(`
      SELECT id, email, created_at, last_sign_in_at, raw_user_meta_data
      FROM auth.users
      ORDER BY created_at DESC;
    `);
    console.log(`\n--- AUTH.USERS (${authUsers.rows.length}) ---`);
    console.table(authUsers.rows.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      metadata: JSON.stringify(u.raw_user_meta_data || {})
    })));
  } catch (e) {
    console.log('auth.users query error:', e.message);
  }

  // Check profiles & roles
  try {
    const profiles = await client.query(`
      SELECT p.id, p.email, p.full_name, p.role, p.exam_locked, p.selected_exam_id
      FROM profiles p
      ORDER BY p.created_at DESC;
    `);
    console.log(`\n--- PROFILES (${profiles.rows.length}) ---`);
    console.table(profiles.rows);
  } catch (e) {
    console.log('profiles query error:', e.message);
  }

  // Check exams
  try {
    const exams = await client.query(`
      SELECT id, name, slug, is_active, display_order, created_at
      FROM exams
      ORDER BY display_order ASC;
    `);
    console.log(`\n--- EXAMS (${exams.rows.length}) ---`);
    console.table(exams.rows);
  } catch (e) {
    console.log('exams query error:', e.message);
  }

  // Check subjects
  try {
    const subjects = await client.query(`
      SELECT id, name, slug, exam_id, is_active
      FROM subjects
      LIMIT 20;
    `);
    console.log(`\n--- SUBJECTS SAMPLE (${subjects.rows.length}) ---`);
    console.table(subjects.rows);
  } catch (e) {
    console.log('subjects query error:', e.message);
  }

  // Check topics
  try {
    const topics = await client.query(`
      SELECT id, name, slug, subject_id, is_active, created_at
      FROM topics
      LIMIT 20;
    `);
    console.log(`\n--- TOPICS SAMPLE (${topics.rows.length}) ---`);
    console.table(topics.rows);
  } catch (e) {
    console.log('topics query error:', e.message);
  }

  // Check MCQs
  try {
    const mcqs = await client.query(`
      SELECT id, topic_id, question, is_published, quality_status, created_at
      FROM mcqs
      LIMIT 10;
    `);
    console.log(`\n--- MCQS SAMPLE (${mcqs.rows.length}) ---`);
    console.table(mcqs.rows.map(m => ({
      id: m.id,
      topic_id: m.topic_id,
      question: m.question ? m.question.substring(0, 50) + '...' : null,
      is_published: m.is_published,
      quality_status: m.quality_status,
      created_at: m.created_at
    })));
  } catch (e) {
    console.log('mcqs query error:', e.message);
  }

  // Check notes
  try {
    const notes = await client.query(`
      SELECT id, topic_id, title, is_published, created_at
      FROM notes
      LIMIT 10;
    `);
    console.log(`\n--- NOTES SAMPLE (${notes.rows.length}) ---`);
    console.table(notes.rows);
  } catch (e) {
    console.log('notes query error:', e.message);
  }

  // Check flashcards
  try {
    const flashcards = await client.query(`
      SELECT id, topic_id, front, is_published, created_at
      FROM flashcards
      LIMIT 10;
    `);
    console.log(`\n--- FLASHCARDS SAMPLE (${flashcards.rows.length}) ---`);
    console.table(flashcards.rows.map(f => ({
      id: f.id,
      topic_id: f.topic_id,
      front: f.front ? f.front.substring(0, 40) + '...' : null,
      is_published: f.is_published
    })));
  } catch (e) {
    console.log('flashcards query error:', e.message);
  }

  // Check payment / subscriptions / transactions
  try {
    const subs = await client.query(`SELECT * FROM subscriptions LIMIT 10`);
    console.log(`\n--- SUBSCRIPTIONS (${subs.rows.length}) ---`);
    console.table(subs.rows);
  } catch (e) {
    console.log('subscriptions error:', e.message);
  }

  try {
    const payments = await client.query(`SELECT * FROM payment_orders LIMIT 10`);
    console.log(`\n--- PAYMENT ORDERS (${payments.rows.length}) ---`);
    console.table(payments.rows);
  } catch (e) {
    console.log('payment_orders error:', e.message);
  }

  try {
    const switches = await client.query(`SELECT * FROM exam_switch_transactions LIMIT 10`);
    console.log(`\n--- EXAM SWITCH TRANSACTIONS (${switches.rows.length}) ---`);
    console.table(switches.rows);
  } catch (e) {
    console.log('exam_switch_transactions error:', e.message);
  }

  // Check generation jobs
  try {
    const jobs = await client.query(`SELECT id, user_id, job_type, status, created_at FROM generation_jobs LIMIT 10`);
    console.log(`\n--- GENERATION JOBS (${jobs.rows.length}) ---`);
    console.table(jobs.rows);
  } catch (e) {
    console.log('generation_jobs error:', e.message);
  }

  // Check blogs
  try {
    const blogs = await client.query(`SELECT id, title, slug, is_published, created_at FROM blogs LIMIT 10`);
    console.log(`\n--- BLOGS (${blogs.rows.length}) ---`);
    console.table(blogs.rows);
  } catch (e) {
    console.log('blogs error:', e.message);
  }

  await client.end();
}

auditData().catch(console.error);
