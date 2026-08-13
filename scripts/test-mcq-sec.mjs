import pg from 'pg';
const { Client } = pg;

const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');

async function testMcqFunctions() {
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- TEST 1: Fetch Public MCQ by Slug ---');
  const resPublic = await client.query(`SELECT * FROM get_public_mcq_by_slug('usmle-biochem-glycolysis-rate-limiting-step-001');`);
  console.log('Returned Columns:', Object.keys(resPublic.rows[0] || {}));
  console.log('Public Data:', JSON.stringify(resPublic.rows[0], null, 2));

  console.log('\n--- TEST 2: Verify correct_answer is NOT in public row ---');
  if ('correct_answer' in (resPublic.rows[0] || {})) {
    console.error('CRITICAL ERROR: correct_answer exposed in public RPC!');
  } else {
    console.log('PASS: correct_answer is completely absent from public MCQ row.');
  }

  console.log('\n--- TEST 3: Submit Answer Server-Side (Incorrect Option) ---');
  const mcqId = resPublic.rows[0]?.id;
  const resIncorrect = await client.query(`SELECT submit_mcq_answer_atomic(NULL, $1, 0, 'Hexokinase');`, [mcqId]);
  console.log('Submit Incorrect Result:', resIncorrect.rows[0]?.submit_mcq_answer_atomic);

  console.log('\n--- TEST 4: Submit Answer Server-Side (Correct Option) ---');
  const resCorrect = await client.query(`SELECT submit_mcq_answer_atomic(NULL, $1, 1, 'Phosphofructokinase-1 (PFK-1)');`, [mcqId]);
  console.log('Submit Correct Result:', resCorrect.rows[0]?.submit_mcq_answer_atomic);

  await client.end();
}

testMcqFunctions().catch(console.error);
