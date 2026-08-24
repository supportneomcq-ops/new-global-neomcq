import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyCatalog() {
  console.log('--- NeoMCQ India Catalog Verification Report ---');

  // Authorities count
  const { data: authorities, count: authCount } = await supabase
    .from('exam_authorities')
    .select('id, code, name, country:countries(name)', { count: 'exact' });

  console.log(`\n1. Exam Authorities: Total = ${authCount || authorities?.length}`);
  authorities?.slice(0, 5).forEach(a => console.log(`   - [${a.code}] ${a.name}`));

  // Master Subjects count
  const { data: masterSubjects, count: subjCount } = await supabase
    .from('subjects')
    .select('id, name, slug, category:exam_categories(name)', { count: 'exact' });

  console.log(`\n2. Master Canonical Subjects: Total = ${subjCount || masterSubjects?.length}`);
  masterSubjects?.slice(0, 5).forEach(s => console.log(`   - [${s.slug}] ${s.name}`));

  // Master Topics count
  const { data: masterTopics, count: topicCount } = await supabase
    .from('topics')
    .select('id, name, slug, subject:subjects(name)', { count: 'exact' });

  console.log(`\n3. Master Canonical Topics: Total = ${topicCount || masterTopics?.length}`);
  masterTopics?.slice(0, 5).forEach(t => console.log(`   - [${t.slug}] ${t.name}`));

  // Exams count
  const { data: exams, count: examCount } = await supabase
    .from('exams')
    .select('id, name, slug, exam_type, authority:exam_authorities(code), is_current, verification_status', { count: 'exact' });

  console.log(`\n4. Exams in Catalog: Total = ${examCount || exams?.length}`);
  exams?.slice(0, 8).forEach(e => console.log(`   - [${e.slug}] ${e.name} (${e.authority?.code || 'N/A'}) - Status: ${e.verification_status}`));

  // Exam Subjects count
  const { data: examSubjs, count: esCount } = await supabase
    .from('exam_subjects')
    .select('id, name, exam:exams(slug), subject:subjects(name)', { count: 'exact' });

  console.log(`\n5. Exam Subject Linkages: Total = ${esCount || examSubjs?.length}`);

  // Exam Topics count
  const { data: examTopics, count: etCount } = await supabase
    .from('exam_topics')
    .select('id, name, topic:topics(name)', { count: 'exact' });

  console.log(`\n6. Exam Topic Linkages: Total = ${etCount || examTopics?.length}`);

  // Exam Versions
  const { data: versions, count: vCount } = await supabase
    .from('exam_versions')
    .select('id, version_year, is_current, exam:exams(slug)', { count: 'exact' });

  console.log(`\n7. Exam Versions: Total = ${vCount || versions?.length}`);

  console.log('\n--- Verification Summary End ---');
}

verifyCatalog().catch(console.error);
