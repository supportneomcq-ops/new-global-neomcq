import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function checkDetails() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log('=== INDIA COUNTRY ROW ===');
  const inRow = await client.query(`SELECT id, iso2, iso3, name, phone_code FROM countries WHERE iso2 = 'IN'`);
  console.table(inRow.rows);

  console.log('=== EXAM CATEGORIES ===');
  const cat = await client.query(`SELECT id, name, slug, description FROM exam_categories ORDER BY name`);
  console.table(cat.rows);

  console.log('=== EXISTING EXAMS WITH SUBJECTS COUNT ===');
  const ex = await client.query(`
    SELECT e.id, e.name, e.slug, c.name as category, co.name as country,
      (SELECT count(*) FROM exam_subjects es WHERE es.exam_id = e.id) as subjects_count
    FROM exams e
    LEFT JOIN exam_categories c ON e.category_id = c.id
    LEFT JOIN countries co ON e.country_id = co.id
    ORDER BY e.name
  `);
  console.table(ex.rows);

  await client.end();
  process.exit(0);
}

checkDetails();
