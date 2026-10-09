import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

async function run() {
  const rawUrl = process.env.POSTGRES_URL;
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const report = {};

  // 1. Preserved counts
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
  report.counts = {};
  for (const [t, q] of Object.entries(countQueries)) {
    const res = await client.query(q);
    report.counts[t] = parseInt(res.rows[0].count, 10);
  }

  // 2. All tables RLS status
  const rlsRes = await client.query(`
    SELECT
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  report.total_tables = rlsRes.rows.length;
  report.rls_disabled = rlsRes.rows.filter(r => !r.rls_enabled).map(r => r.table_name);
  report.rls_enabled = rlsRes.rows.filter(r => r.rls_enabled).map(r => r.table_name);

  // 3. All policies on all tables
  const polRes = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  report.total_policies = polRes.rows.length;
  report.policies_by_table = {};
  for (const p of polRes.rows) {
    if (!report.policies_by_table[p.tablename]) {
      report.policies_by_table[p.tablename] = [];
    }
    report.policies_by_table[p.tablename].push(p);
  }

  // 4. Detailed analysis of 5 tables
  const targetTables = [
    'ai_discovered_exams',
    'user_exam_selections',
    'user_study_topics',
    'ai_tutor_tts_cache',
    'active_recall_batches',
  ];
  report.target_tables = {};
  for (const t of targetTables) {
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    const rowCount = await client.query(`SELECT count(*) FROM "${t}"`);
    report.target_tables[t] = {
      rowCount: parseInt(rowCount.rows[0].count, 10),
      columns: cols.rows,
      existing_policies: report.policies_by_table[t] || []
    };
  }

  // 5. All functions in public schema
  const fnsRes = await client.query(`
    SELECT
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      p.prosecdef AS is_security_definer,
      p.provolatile AS volatility,
      p.proconfig AS config,
      pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `);
  report.total_functions = fnsRes.rows.length;
  report.security_definer_functions = fnsRes.rows.filter(f => f.is_security_definer);
  report.security_invoker_functions = fnsRes.rows.filter(f => !f.is_security_definer);

  // 6. Routine privileges
  const grantsRes = await client.query(`
    SELECT
      routine_name,
      grantee,
      privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
    ORDER BY routine_name, grantee;
  `);
  report.grants = grantsRes.rows;

  fs.writeFileSync('scripts/inspection_report.json', JSON.stringify(report, null, 2));
  console.log("Inspection report written to scripts/inspection_report.json");
  console.log("Preservation counts:", report.counts);
  console.log("RLS disabled tables count:", report.rls_disabled.length);
  console.log("RLS disabled tables:", report.rls_disabled);
  console.log("Security definer functions count:", report.security_definer_functions.length);
  console.log("Security definer function names:", report.security_definer_functions.map(f => f.function_name));

  await client.end();
}

run().catch(console.error);
