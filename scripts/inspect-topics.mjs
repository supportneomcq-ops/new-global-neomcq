import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectTopics() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('=== ALL EXAM TOPICS ===');
  const res = await client.query(`
    SELECT t.id, t.name, t.description, t.created_at, s.name as subject_name, e.name as exam_name
    FROM exam_topics t
    JOIN exam_subjects s ON t.subject_id = s.id
    JOIN exams e ON s.exam_id = e.id
    ORDER BY e.name, s.name, t.name;
  `);
  console.table(res.rows);

  await client.end();
}

inspectTopics().catch(console.error);
