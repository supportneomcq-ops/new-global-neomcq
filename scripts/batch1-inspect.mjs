import pg from 'pg';
const { Client } = pg;

async function inspect() {
  const rawUrl = process.env.POSTGRES_URL;
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== 1. PRESERVATION COUNTS (BEFORE) ===");
  const countQueries = {
    exams: 'SELECT count(*) FROM exams',
    exam_versions: 'SELECT count(*) FROM exam_versions',
    exam_subjects: 'SELECT count(*) FROM exam_subjects',
    exam_topics: 'SELECT count(*) FROM exam_topics',
    exam_subtopics: 'SELECT count(*) FROM exam_subtopics',
    exam_evidence: 'SELECT count(*) FROM exam_evidence',
    exam_authorities: 'SELECT count(*) FROM exam_authorities',
    exam_aliases: 'SELECT count(*) FROM exam_aliases',
    ai_jobs: 'SELECT count(*) FROM ai_jobs',
    subjects: 'SELECT count(*) FROM subjects',
    topics: 'SELECT count(*) FROM topics',
    topic_content_state: 'SELECT count(*) FROM topic_content_state',
    topic_refresh_runs: 'SELECT count(*) FROM topic_refresh_runs',
  };

  for (const [table, q] of Object.entries(countQueries)) {
    try {
      const res = await client.query(q);
      console.log(`${table}: ${res.rows[0].count}`);
    } catch (e) {
      console.log(`${table}: ERROR (${e.message})`);
    }
  }

  console.log("\n=== 2. ALL TABLES & RLS STATUS ===");
  const rlsRes = await client.query(`
    SELECT
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  console.log(`Total public tables: ${rlsRes.rows.length}`);
  const rlsDisabled = rlsRes.rows.filter(r => !r.rls_enabled);
  console.log("Tables with RLS DISABLED:", rlsDisabled.map(r => r.table_name));

  console.log("\n=== 3. SCHEMA OF THE 5 TARGET TABLES ===");
  const targetTables = [
    'ai_discovered_exams',
    'user_exam_selections',
    'user_study_topics',
    'ai_tutor_tts_cache',
    'active_recall_batches',
  ];

  for (const t of targetTables) {
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    const rowCount = await client.query(`SELECT count(*) FROM "${t}"`);
    console.log(`\nTable: ${t} (${rowCount.rows[0].count} rows)`);
    console.log("Columns:", cols.rows);
  }

  console.log("\n=== 4. EXISTING POLICIES FOR THE 5 TARGET TABLES ===");
  const polRes = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY($1::text[])
  `, [targetTables]);
  console.log("Policies on target tables:", polRes.rows);

  console.log("\n=== 5. ALL SECURITY DEFINER FUNCTIONS IN PUBLIC SCHEMA ===");
  const secDefRes = await client.query(`
    SELECT
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_functiondef(p.oid) AS definition,
      p.prosecdef AS is_security_definer,
      p.proconfig AS search_path_config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `);
  console.log(`Total SECURITY DEFINER functions in public: ${secDefRes.rows.length}`);
  for (const fn of secDefRes.rows) {
    console.log(`\n--- Function: ${fn.function_name}(${fn.arguments}) ---`);
    console.log(`Search Path: ${fn.search_path_config}`);
    // Print snippet of definition
    console.log(fn.definition);
  }

  console.log("\n=== 6. GRANTS ON SECURITY DEFINER FUNCTIONS ===");
  const grantsRes = await client.query(`
    SELECT
      routine_name,
      grantee,
      privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = ANY($1::text[])
    ORDER BY routine_name, grantee;
  `, [secDefRes.rows.map(r => r.function_name)]);
  console.log("Routine privileges:", grantsRes.rows);

  await client.end();
}

inspect().catch(console.error);
