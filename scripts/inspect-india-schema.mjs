import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function inspectSchema() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    console.log('=== COUNTRIES (INDIA) ===');
    const countries = await client.query(`SELECT id, iso2, iso3, name, phone_code FROM countries WHERE iso2 = 'IN' OR name ILIKE '%India%' LIMIT 5`);
    console.table(countries.rows);

    console.log('=== EXAM CATEGORIES ===');
    const cat = await client.query(`SELECT id, name, slug FROM exam_categories ORDER BY name`);
    console.table(cat.rows);

    console.log('=== EXISTING EXAMS ===');
    const ex = await client.query(`SELECT id, name, slug, country_id, category_id, is_featured, status FROM exams ORDER BY name`);
    console.table(ex.rows);

    console.log('=== EXAMS TABLE COLUMNS ===');
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exams'
      ORDER BY ordinal_position;
    `);
    console.table(cols.rows);

    console.log('=== EXAM_SUBJECTS TABLE COLUMNS ===');
    const scols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_subjects'
      ORDER BY ordinal_position;
    `);
    console.table(scols.rows);

    console.log('=== EXAM_TOPICS TABLE COLUMNS ===');
    const tcols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_topics'
      ORDER BY ordinal_position;
    `);
    console.table(tcols.rows);

    console.log('=== ALL PUBLIC TABLES ===');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.table(tables.rows);
  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

inspectSchema();
