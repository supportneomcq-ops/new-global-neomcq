import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getStats() {
  const [
    { count: authCount },
    { count: examCount },
    { count: verCount },
    { count: subjCount },
    { count: esCount },
    { count: topicCount },
    { count: etCount },
    { count: aliasCount }
  ] = await Promise.all([
    supabase.from('exam_authorities').select('*', { count: 'exact', head: true }),
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('exam_versions').select('*', { count: 'exact', head: true }),
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
    supabase.from('exam_subjects').select('*', { count: 'exact', head: true }),
    supabase.from('topics').select('*', { count: 'exact', head: true }),
    supabase.from('exam_topics').select('*', { count: 'exact', head: true }),
    supabase.from('exam_aliases').select('*', { count: 'exact', head: true }),
  ]);

  console.log('--- EXACT SUPABASE ROW COUNTS ---');
  console.log(`Authorities: ${authCount}`);
  console.log(`Exams: ${examCount}`);
  console.log(`Exam Versions: ${verCount}`);
  console.log(`Master Subjects: ${subjCount}`);
  console.log(`Exam Subjects: ${esCount}`);
  console.log(`Master Topics: ${topicCount}`);
  console.log(`Exam Topics: ${etCount}`);
  console.log(`Aliases: ${aliasCount}`);
}

getStats().catch(console.error);
