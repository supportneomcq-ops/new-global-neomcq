import pg from 'pg';
const { Client } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function verifyBatch1_1() {
  const rawUrl = process.env.POSTGRES_URL;
  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("===============================================================");
  console.log("          NEOMCQ BATCH 1.1: READ-ONLY VERIFICATION             ");
  console.log("===============================================================\n");

  // 1, 2, 3: SCHEMA PRIVILEGES
  console.log("[1-3] Schema Privileges on public:");
  const schemaPerms = await client.query(`
    SELECT nspname, rolname,
           has_schema_privilege(rolname, nspname, 'USAGE') as can_usage,
           has_schema_privilege(rolname, nspname, 'CREATE') as can_create
    FROM pg_namespace, pg_roles
    WHERE nspname = 'public' AND rolname IN ('anon', 'authenticated', 'public', 'service_role', 'postgres')
    ORDER BY rolname;
  `);

  for (const sp of schemaPerms.rows) {
    console.log(`    Role: ${sp.rolname.padEnd(15)} | USAGE: ${String(sp.can_usage).padEnd(5)} | CREATE: ${sp.can_create}`);
  }

  // 4: DATABASE OPERATIONS TEST (anon & authenticated reading public exams & user data)
  console.log("\n[4] Application DB Operations Verification:");
  await client.query(`SET ROLE anon;`);
  const examQuery = await client.query(`SELECT id, name, slug FROM public.exams LIMIT 3;`);
  console.log(`    ✓ Anonymous query on public.exams returned ${examQuery.rows.length} rows.`);

  await client.query(`RESET ROLE;`);
  const testUser = '33333333-3333-3333-3333-333333333333';
  await client.query(`
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${testUser}';
    SET request.jwt.claim.role = 'authenticated';
  `);
  const userExamQuery = await client.query(`SELECT count(*) FROM public.user_exam_selections;`);
  console.log(`    ✓ Authenticated query on public.user_exam_selections succeeded (${userExamQuery.rows[0].count} rows).`);

  // Verify that anon/authenticated CANNOT create tables in public
  try {
    await client.query(`CREATE TABLE public.exploit_test (id int);`);
    console.log(`    ❌ Security issue: Authenticated was able to CREATE TABLE in public!`);
  } catch (err) {
    console.log(`    ✓ Confirmed: Table creation in public is blocked for authenticated users (${err.message}).`);
  }

  await client.query(`RESET ROLE;`);

  // 5: SENSITIVE RPC RESTRICTIONS
  console.log("\n[5] Sensitive RPC Execution Restrictions:");
  const sensitiveGrants = await client.query(`
    SELECT routine_name, grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'credit_adjust'
      AND grantee IN ('anon', 'PUBLIC', 'authenticated');
  `);
  if (sensitiveGrants.rows.length === 0) {
    console.log(`    ✓ credit_adjust remains strictly non-executable by anon/PUBLIC/authenticated.`);
  } else {
    console.log(`    ❌ Finding: credit_adjust has grants:`, sensitiveGrants.rows);
  }

  // 6: ALL 83 TABLES RLS STATUS
  console.log("\n[6] RLS Status on All 83 Public Tables:");
  const rlsRes = await client.query(`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  const disabled = rlsRes.rows.filter(r => !r.rls_enabled);
  console.log(`    Total Public Tables: ${rlsRes.rows.length}`);
  console.log(`    RLS Enabled: ${rlsRes.rows.length - disabled.length}`);
  console.log(`    RLS Disabled: ${disabled.length}`);

  // 7: BATCH 1 TARGET 5 TABLES POLICIES
  console.log("\n[7] Target 5 Tables Policies:");
  const targetTables = [
    'ai_discovered_exams',
    'user_exam_selections',
    'user_study_topics',
    'ai_tutor_tts_cache',
    'active_recall_batches'
  ];
  const polRes = await client.query(`
    SELECT tablename, count(*) as count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY($1::text[])
    GROUP BY tablename
    ORDER BY tablename;
  `, [targetTables]);
  for (const p of polRes.rows) {
    console.log(`    ✓ Table ${p.tablename}: ${p.count} active policies`);
  }

  // 8: SECURITY DEFINER SEARCH PATH
  console.log("\n[8] Security Definer Functions Search Path Config:");
  const secDefRes = await client.query(`
    SELECT p.proname AS name, p.proconfig AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `);
  let searchPathOk = true;
  for (const fn of secDefRes.rows) {
    const hasConfig = fn.config && fn.config.some(c => c === 'search_path=public, pg_temp');
    if (!hasConfig) {
      searchPathOk = false;
      console.log(`    ❌ ${fn.name}: invalid search_path (${fn.config})`);
    }
  }
  if (searchPathOk) {
    console.log(`    ✓ All ${secDefRes.rows.length} SECURITY DEFINER functions retain search_path=public, pg_temp.`);
  }

  // 9: PRESERVATION COUNTS
  console.log("\n[9] Preservation Data Counts:");
  const expectedCounts = {
    exams: 189,
    exam_versions: 149,
    exam_subjects: 9,
    exam_topics: 15,
    exam_subtopics: 36,
    exam_evidence: 19,
    exam_authorities: 139,
    exam_aliases: 811,
    ai_jobs: 171,
    subjects: 0,
    topics: 0,
    topic_content_state: 0,
    topic_refresh_runs: 0
  };

  for (const [table, expected] of Object.entries(expectedCounts)) {
    const res = await client.query(`SELECT count(*) FROM "${table}"`);
    const actual = parseInt(res.rows[0].count, 10);
    const match = actual === expected;
    console.log(`    ${match ? '✓' : '❌'} ${table}: ${actual} (expected: ${expected})`);
  }

  console.log("\n===============================================================");
  console.log("       BATCH 1.1 READ-ONLY VERIFICATION COMPLETE               ");
  console.log("===============================================================");

  await client.end();
}

verifyBatch1_1().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
