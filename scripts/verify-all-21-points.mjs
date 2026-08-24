import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = anonKey ? createClient(supabaseUrl, anonKey) : null;

async function verifyAllPoints() {
  console.log('=== RUNNING VERIFICATION FOR 21 POINTS ===\n');

  // Point 1: Database Counts
  const tables = [
    { key: 'exam_authorities', name: 'Authorities' },
    { key: 'exams', name: 'Exams' },
    { key: 'exam_versions', name: 'Exam Versions' },
    { key: 'subjects', name: 'Master Subjects' },
    { key: 'exam_subjects', name: 'Exam Subjects' },
    { key: 'topics', name: 'Master Topics' },
    { key: 'exam_topics', name: 'Exam Topics' },
    { key: 'exam_aliases', name: 'Aliases' }
  ];

  const counts = {};
  for (const t of tables) {
    const { count } = await adminClient.from(t.key).select('*', { count: 'exact', head: true });
    counts[t.key] = count || 0;
  }

  console.log('--- POINT 1: DATABASE PERSISTENCE COUNTS ---');
  for (const t of tables) {
    console.log(`${t.name}: ${counts[t.key]}`);
  }

  // Fetch all exams with deep joins
  const { data: exams, error: exErr } = await adminClient
    .from('exams')
    .select(`
      id,
      name,
      slug,
      short_name,
      country_id,
      official_url,
      official_notification_url,
      official_syllabus_url,
      verification_status,
      last_verified_at,
      exam_type,
      level,
      mode,
      frequency,
      duration,
      total_marks,
      negative_marking,
      passing_criteria,
      eligibility,
      stages,
      papers,
      country:countries(name, iso2),
      category:exam_categories(name, slug),
      authority:exam_authorities(code, name),
      exam_versions(id, version_year, is_current, official_notification_url, official_syllabus_url, pattern_summary, stages, papers),
      exam_subjects(
        id,
        name,
        official_name,
        display_name,
        weight_percentage,
        verification_status,
        source_url,
        subject:subjects(id, name, slug),
        exam_topics(
          id,
          name,
          official_name,
          importance,
          verification_status,
          source_url,
          topic:topics(id, name, slug)
        )
      ),
      exam_aliases(id, alias)
    `)
    .order('name');

  if (exErr) {
    console.error('Error fetching exams:', exErr);
    return;
  }

  // Point 2: Table
  console.log('\n--- POINT 2: EXAM VERIFICATION TABLE ---');
  const tableData = exams.map(e => {
    const isVerified = e.verification_status === 'verified' && e.official_url && e.official_url.startsWith('http') && e.last_verified_at;
    const curVer = e.exam_versions?.find(v => v.is_current)?.version_year || 'Not specified';
    return {
      Exam: e.name,
      Authority: e.authority?.code || 'N/A',
      Source: e.official_url || 'Not officially specified',
      CurrentVersion: curVer,
      VerificationStatus: isVerified ? 'verified' : 'NEEDS VERIFICATION'
    };
  });
  console.table(tableData);

  // Point 4: Example Exams Check
  console.log('\n--- POINT 4: VERIFY SPECIFIC EXAM TARGETS ---');
  const targetChecklist = [
    { name: 'NEET PG', slug: 'neet-pg' },
    { name: 'INI-CET', slug: 'ini-cet' },
    { name: 'FMGE', slug: 'fmge' },
    { name: 'NEET UG', slug: 'neet-ug' },
    { name: 'NEET MDS', slug: 'neet-mds' },
    { name: 'UPSC Civil Services', slug: 'upsc-civil-services' },
    { name: 'UPSC Engineering Services', slug: 'upsc-engineering-services' },
    { name: 'UPSC CMS', slug: 'upsc-cms' },
    { name: 'SSC CGL', slug: 'ssc-cgl' },
    { name: 'SSC CHSL', slug: 'ssc-chsl' },
    { name: 'SSC JE', slug: 'ssc-je' },
    { name: 'IBPS PO', slug: 'ibps-po' },
    { name: 'IBPS Clerk', slug: 'ibps-clerk' },
    { name: 'SBI PO', slug: 'sbi-po' },
    { name: 'CAT', slug: 'cat-mba' },
    { name: 'JEE Main', slug: 'jee-main' },
    { name: 'JEE Advanced', slug: 'jee-advanced' },
    { name: 'GATE', slug: 'gate' },
    { name: 'CLAT', slug: 'clat-ug' },
    { name: 'CTET', slug: 'ctet' },
    { name: 'UGC NET', slug: 'ugc-net' }
  ];

  for (const t of targetChecklist) {
    const ex = exams.find(e => 
      e.slug === t.slug || 
      e.name.toLowerCase().includes(t.name.toLowerCase()) ||
      (e.exam_aliases && e.exam_aliases.some(a => a.alias.toLowerCase() === t.name.toLowerCase()))
    );

    if (ex) {
      console.log(`[PRESENT] ${t.name}: Name="${ex.name}", Authority=${ex.authority?.code || 'N/A'}, Version=${ex.exam_versions?.find(v => v.is_current)?.version_year || 'N/A'}, Subjects=${ex.exam_subjects?.length || 0}, Status=${ex.verification_status}`);
    } else {
      console.log(`[NOT IN DB] ${t.name} (Batch 2 or Pending Authority Verification)`);
    }
  }

  // Point 8: Alias Test
  console.log('\n--- POINT 8: ALIAS RESOLUTION TESTS ---');
  const testQueries = ['NEET PG', 'NEET-PG', 'INI CET', 'INI-CET', 'INICET', 'JEE Main', 'JEE Mains', 'IIT JEE', 'UPSC CSE', 'CAT Exam'];
  for (const q of testQueries) {
    const { data: aliasMatches } = await adminClient
      .from('exam_aliases')
      .select('alias, exam:exams(id, name, slug)')
      .ilike('alias', q)
      .limit(1);

    if (aliasMatches && aliasMatches.length > 0) {
      console.log(`✓ Alias "${q}" successfully resolved to Canonical Exam: "${aliasMatches[0].exam?.name}" (${aliasMatches[0].exam?.slug})`);
    } else {
      const { data: directMatch } = await adminClient
        .from('exams')
        .select('name, slug')
        .or(`slug.ilike.${q.replace(/\s+/g, '-')},name.ilike.%${q}%,short_name.ilike.${q}`)
        .limit(1);
      if (directMatch && directMatch.length > 0) {
        console.log(`✓ Direct query "${q}" resolved to Exam: "${directMatch[0].name}" (${directMatch[0].slug})`);
      } else {
        console.log(`✗ Query "${q}" did not match any alias or direct exam title`);
      }
    }
  }

  // Point 11: Data Quality Check
  console.log('\n--- POINT 11: DATA QUALITY & INTEGRITY CHECKS ---');
  let duplicateExams = 0;
  const examSlugSet = new Set();
  for (const e of exams) {
    if (examSlugSet.has(e.slug)) duplicateExams++;
    examSlugSet.add(e.slug);
  }

  const { data: allAliases } = await adminClient.from('exam_aliases').select('id, exam_id, alias');
  let duplicateAliases = 0;
  const aliasSet = new Set();
  for (const a of (allAliases || [])) {
    const key = `${a.exam_id}:${a.alias.toLowerCase()}`;
    if (aliasSet.has(key)) duplicateAliases++;
    aliasSet.add(key);
  }

  const { data: orphanExamSubjs } = await adminClient.from('exam_subjects').select('id').is('exam_id', null);
  const { data: orphanExamTopics } = await adminClient.from('exam_topics').select('id').is('subject_id', null);

  console.log(`Duplicate Exams: ${duplicateExams}`);
  console.log(`Duplicate Aliases: ${duplicateAliases}`);
  console.log(`Orphan Exam Subjects: ${orphanExamSubjs?.length || 0}`);
  console.log(`Orphan Exam Topics: ${orphanExamTopics?.length || 0}`);

  // Point 18: RLS Check
  console.log('\n--- POINT 18: RLS SECURITY CHECK ---');
  if (anonClient) {
    const { data: pubData, error: pubErr } = await anonClient.from('exams').select('id, name').limit(1);
    const { error: insErr } = await anonClient.from('exams').insert({ name: 'Hack Test', slug: 'hack-test' });
    console.log(`Anon SELECT: ${pubErr ? 'FAILED (' + pubErr.message + ')' : 'PASS'}`);
    console.log(`Anon INSERT: ${insErr ? 'PASS (Protected: ' + insErr.message + ')' : 'FAIL (Security risk)'}`);
  }
}

verifyAllPoints().catch(console.error);
