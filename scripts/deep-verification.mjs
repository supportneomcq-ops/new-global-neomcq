import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = anonKey ? createClient(supabaseUrl, anonKey) : null;

async function runDeepVerification() {
  console.log('====================================================');
  console.log('     NEOMCQ INDIA CATALOG BATCH 1 AUDIT REPORT      ');
  console.log('====================================================\n');

  // 1. Database Persistence - Real row counts from Supabase
  console.log('--- 1. DATABASE COUNTS ---');
  const tables = [
    'exam_authorities',
    'exams',
    'exam_versions',
    'subjects',
    'exam_subjects',
    'topics',
    'exam_topics',
    'exam_aliases'
  ];

  const counts = {};
  for (const table of tables) {
    const { count, error } = await adminClient.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error counting ${table}:`, error.message);
      counts[table] = 0;
    } else {
      counts[table] = count;
    }
  }

  console.log(`exam_authorities: ${counts.exam_authorities}`);
  console.log(`exams: ${counts.exams}`);
  console.log(`exam_versions: ${counts.exam_versions}`);
  console.log(`master_subjects: ${counts.subjects}`);
  console.log(`exam_subjects: ${counts.exam_subjects}`);
  console.log(`master_topics: ${counts.topics}`);
  console.log(`exam_topics: ${counts.exam_topics}`);
  console.log(`exam_aliases: ${counts.exam_aliases}\n`);

  // Let's check exam_aliases column names
  const { data: sampleAlias } = await adminClient.from('exam_aliases').select('*').limit(1);
  console.log('Sample alias structure:', sampleAlias);

  // 2. Fetch all exams with relationships
  console.log('--- 2 & 3. EXAM VERIFICATION & OFFICIAL SOURCE VERIFICATION ---');
  const { data: allExams, error: examsErr } = await adminClient
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
      country:countries(name, iso2),
      category:exam_categories(name, slug),
      authority:exam_authorities(code, name),
      exam_versions(id, version_year, is_current, official_notification_url, official_syllabus_url, pattern_summary),
      exam_subjects(
        id,
        name,
        official_name,
        display_name,
        weight_percentage,
        subject:subjects(id, name, slug),
        exam_topics(
          id,
          name,
          official_name,
          importance,
          topic:topics(id, name, slug)
        )
      ),
      exam_aliases(id, alias)
    `)
    .order('name');

  if (examsErr) {
    console.error('Error fetching exams:', examsErr);
    return;
  }

  console.log(`Fetched ${allExams.length} exams from production database.\n`);

  const examTable = [];
  let fullyVerifiedCount = 0;
  let needsVerificationCount = 0;

  for (const ex of allExams) {
    const hasOfficialUrl = Boolean(ex.official_url && ex.official_url.startsWith('http'));
    const isFullyVerified = ex.verification_status === 'verified' && hasOfficialUrl && ex.last_verified_at;

    if (isFullyVerified) {
      fullyVerifiedCount++;
    } else {
      needsVerificationCount++;
    }

    const currentVer = ex.exam_versions?.find(v => v.is_current)?.version_year || 'Not specified';

    examTable.push({
      Exam: ex.name,
      Authority: ex.authority?.code || 'N/A',
      Source: ex.official_url || 'Not officially specified',
      CurrentVersion: currentVer,
      VerificationStatus: isFullyVerified ? 'verified' : 'NEEDS VERIFICATION',
      SubjectsCount: ex.exam_subjects?.length || 0,
      TopicsCount: ex.exam_subjects?.reduce((acc, s) => acc + (s.exam_topics?.length || 0), 0) || 0,
      AliasesCount: ex.exam_aliases?.length || 0
    });
  }

  console.table(examTable);

  // 4. Specific Target Example Exams Audit
  console.log('\n--- 4. SPECIFIC EXAMPLE EXAMS AUDIT ---');
  const targetExams = [
    'NEET PG',
    'INI-CET',
    'FMGE',
    'NEET UG',
    'NEET MDS',
    'UPSC Civil Services',
    'UPSC Engineering Services',
    'UPSC CMS',
    'SSC CGL',
    'SSC CHSL',
    'SSC JE',
    'IBPS PO',
    'IBPS Clerk',
    'SBI PO',
    'CAT',
    'JEE Main',
    'JEE Advanced',
    'GATE',
    'CLAT',
    'CTET',
    'UGC NET'
  ];

  for (const target of targetExams) {
    const found = allExams.find(e => 
      e.name.toLowerCase() === target.toLowerCase() || 
      e.short_name?.toLowerCase() === target.toLowerCase() ||
      e.slug.toLowerCase() === target.toLowerCase().replace(/\s+/g, '-') ||
      (e.exam_aliases && e.exam_aliases.some(a => a.alias.toLowerCase() === target.toLowerCase()))
    );
    if (found) {
      console.log(`[FOUND] ${target} -> "${found.name}" (slug: ${found.slug}) | Auth: ${found.authority?.code || 'N/A'} | Subjs: ${found.exam_subjects?.length} | Current Ver: ${found.exam_versions?.find(v => v.is_current)?.version_year || 'N/A'}`);
    } else {
      console.log(`[NOT IN DATABASE / NEEDS CREATION] ${target}`);
    }
  }

  // 5 & 6. Complete Subject & Topic Mapping Listing
  console.log('\n--- 5 & 6. SUBJECTS AND ATTACHED TOPICS PER EXAM ---');
  for (const ex of allExams) {
    console.log(`\n=== EXAM: ${ex.name} (${ex.slug}) ===`);
    console.log(`Official Authority: ${ex.authority?.name || 'N/A'} (${ex.authority?.code || 'N/A'})`);
    console.log(`Official Source: ${ex.official_url || 'Not officially specified'}`);
    console.log(`Status: ${ex.verification_status}`);
    
    if (!ex.exam_subjects || ex.exam_subjects.length === 0) {
      console.log('  (No subjects attached)');
      continue;
    }

    for (const es of ex.exam_subjects) {
      const topicCount = es.exam_topics?.length || 0;
      console.log(`  → Subject: ${es.name} [Master: ${es.subject?.name || 'Unmapped'}] (${topicCount} topics)`);
      if (es.exam_topics && es.exam_topics.length > 0) {
        for (const et of es.exam_topics) {
          console.log(`      • ${et.name} [Master Topic: ${et.topic?.name || 'Unmapped'}] (Importance: ${et.importance})`);
        }
      }
    }
  }

  // 7 & 11. Duplicate and Orphan Checks
  console.log('\n--- 7 & 11. INTEGRITY AUDIT (Duplicates & Orphans) ---');
  // Check duplicate master subjects
  const { data: masterSubjs } = await adminClient.from('subjects').select('id, slug, name');
  const subjSlugs = new Map();
  let dupMasterSubjs = 0;
  for (const s of (masterSubjs || [])) {
    if (subjSlugs.has(s.slug)) {
      dupMasterSubjs++;
      console.warn(`Duplicate master subject slug: ${s.slug}`);
    }
    subjSlugs.set(s.slug, s.id);
  }

  // Check duplicate master topics
  const { data: masterTopics } = await adminClient.from('topics').select('id, slug, name, subject_id');
  const topicKeys = new Set();
  let dupMasterTopics = 0;
  for (const t of (masterTopics || [])) {
    const key = `${t.subject_id}:${t.slug}`;
    if (topicKeys.has(key)) {
      dupMasterTopics++;
      console.warn(`Duplicate master topic: ${t.slug} in subject ${t.subject_id}`);
    }
    topicKeys.add(key);
  }

  // Check duplicate exam slugs
  const examSlugs = new Set();
  let dupExamSlugs = 0;
  for (const e of allExams) {
    if (examSlugs.has(e.slug)) {
      dupExamSlugs++;
      console.warn(`Duplicate exam slug: ${e.slug}`);
    }
    examSlugs.add(e.slug);
  }

  // Check duplicate aliases
  const { data: allAliases } = await adminClient.from('exam_aliases').select('id, exam_id, alias');
  const aliasMap = new Set();
  let dupAliases = 0;
  for (const a of (allAliases || [])) {
    const key = `${a.exam_id}:${a.alias.toLowerCase()}`;
    if (aliasMap.has(key)) {
      dupAliases++;
      console.warn(`Duplicate alias: ${a.alias} for exam ${a.exam_id}`);
    }
    aliasMap.add(key);
  }

  // Check orphan exam_subjects
  const { data: orphanExamSubjs } = await adminClient
    .from('exam_subjects')
    .select('id, exam_id, subject_id, name')
    .is('exam_id', null);

  // Check orphan exam_topics
  const { data: orphanExamTopics } = await adminClient
    .from('exam_topics')
    .select('id, subject_id, topic_id, name')
    .is('subject_id', null);

  console.log(`Duplicate Master Subjects: ${dupMasterSubjs}`);
  console.log(`Duplicate Master Topics: ${dupMasterTopics}`);
  console.log(`Duplicate Exam Slugs: ${dupExamSlugs}`);
  console.log(`Duplicate Aliases: ${dupAliases}`);
  console.log(`Orphan Exam Subjects: ${orphanExamSubjs?.length || 0}`);
  console.log(`Orphan Exam Topics: ${orphanExamTopics?.length || 0}`);

  // 18. RLS Security Checks
  console.log('\n--- 18. RLS POLICIES VERIFICATION ---');
  if (anonClient) {
    const { data: pubExams, error: pubErr } = await anonClient.from('exams').select('id, name').limit(2);
    console.log(`Public Anon Read (exams): ${pubErr ? 'FAILED (' + pubErr.message + ')' : 'PASSED (Read ' + pubExams?.length + ' records)'}`);

    const { data: pubIns, error: pubInsErr } = await anonClient.from('exams').insert({ name: 'Unauthorized Exam', slug: 'unauth-exam' });
    console.log(`Public Anon Write (exams): ${pubInsErr ? 'PASSED (Protected: ' + pubInsErr.message + ')' : 'FAILED (Security leak!)'}`);
  }

  console.log('\nAudit execution complete.');
}

runDeepVerification().catch(console.error);
