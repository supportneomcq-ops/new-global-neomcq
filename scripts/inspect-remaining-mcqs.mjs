import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectRemainingMcqs() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT m.id, m.question, m.source, m.slug, m.created_at, e.name as exam, s.name as subject, t.name as topic
    FROM mcqs m
    LEFT JOIN exams e ON m.exam_id = e.id
    LEFT JOIN exam_subjects s ON m.subject_id = s.id
    LEFT JOIN exam_topics t ON m.topic_id = t.id
    ORDER BY m.created_at
    OFFSET 20;
  `);
  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];
    console.log(`[${i+21}] ID: ${row.id} | Exam: ${row.exam} | Subject: ${row.subject} | Topic: ${row.topic} | Source: ${row.source}`);
    console.log(`    Slug: ${row.slug}`);
    console.log(`    Question: ${row.question}`);
    console.log('---');
  }

  await client.end();
}

inspectRemainingMcqs().catch(console.error);
