import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectIndiaTopic() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT t.id, t.name, t.description, t.created_at, s.name as subject_name, e.name as exam_name
    FROM exam_topics t
    JOIN exam_subjects s ON t.subject_id = s.id
    JOIN exams e ON s.exam_id = e.id
    WHERE t.name ILIKE '%india%' OR t.name ILIKE '%test%' OR t.name ILIKE '%demo%';
  `);
  console.table(res.rows);

  await client.end();
}

inspectIndiaTopic().catch(console.error);
