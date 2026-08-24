import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const UK_COUNTRY_ID = '53f43aaa-5d56-467b-ba77-351899847efb';

async function auditUK() {
  console.log('=== VERIFYING UK CATALOG SEEDING STATUS ===\n');

  // 1. UK Authorities
  const { data: authorities, error: authErr } = await supabase
    .from('exam_authorities')
    .select('id, code, name')
    .eq('country_id', UK_COUNTRY_ID);

  if (authErr) console.error('Error fetching authorities:', authErr);

  // 2. UK Exams
  const { data: exams, error: examErr } = await supabase
    .from('exams')
    .select('id, name, slug, verification_status, authority_id')
    .eq('country_id', UK_COUNTRY_ID)
    .order('name');

  if (examErr) console.error('Error fetching exams:', examErr);

  const examIds = exams?.map(e => e.id) || [];

  // 3. Exam Subjects
  const { data: examSubjects, error: subjErr } = await supabase
    .from('exam_subjects')
    .select('id, exam_id, name, official_name')
    .in('exam_id', examIds.length ? examIds : ['00000000-0000-0000-0000-000000000000']);

  if (subjErr) console.error('Error fetching exam_subjects:', subjErr);

  const examSubjIds = examSubjects?.map(s => s.id) || [];

  // 4. Exam Topics
  const { data: examTopics, error: topicErr } = await supabase
    .from('exam_topics')
    .select('id, subject_id, name')
    .in('subject_id', examSubjIds.length ? examSubjIds : ['00000000-0000-0000-0000-000000000000']);

  if (topicErr) console.error('Error fetching exam_topics:', topicErr);

  // 5. Aliases
  const { data: aliases, error: aliasErr } = await supabase
    .from('exam_aliases')
    .select('id, exam_id, alias')
    .in('exam_id', examIds.length ? examIds : ['00000000-0000-0000-0000-000000000000']);

  if (aliasErr) console.error('Error fetching aliases:', aliasErr);

  console.log('--- SUMMARY STATS ---');
  console.log(`UK Authorities    : ${authorities?.length || 0}`);
  console.log(`UK Exams          : ${exams?.length || 0}`);
  console.log(`UK Exam Subjects  : ${examSubjects?.length || 0}`);
  console.log(`UK Exam Topics    : ${examTopics?.length || 0}`);
  console.log(`UK Exam Aliases   : ${aliases?.length || 0}`);

  const verifiedExams = exams?.filter(e => e.verification_status === 'verified') || [];
  console.log(`Verified UK Exams : ${verifiedExams.length} / ${exams?.length || 0}`);

  console.log('\n--- DETAILED EXAM BREAKDOWN ---');
  for (let i = 0; i < (exams || []).length; i++) {
    const e = exams[i];
    const eSubjs = examSubjects?.filter(s => s.exam_id === e.id) || [];
    const eSubjIds = eSubjs.map(s => s.id);
    const eTopics = examTopics?.filter(t => eSubjIds.includes(t.subject_id)) || [];
    const eAliases = aliases?.filter(a => a.exam_id === e.id) || [];

    console.log(`${i + 1}. [${e.verification_status.toUpperCase()}] ${e.name} (${e.slug}):`);
    console.log(`   - Subjects: ${eSubjs.length}, Topics: ${eTopics.length}, Aliases: ${eAliases.length}`);
  }
}

auditUK();
