import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkJunctionCols() {
  const { data: es } = await supabase.from('exam_subjects').select('*').limit(1);
  console.log('Exam Subjects cols:', Object.keys(es?.[0] || {}));

  const { data: et } = await supabase.from('exam_topics').select('*').limit(1);
  console.log('Exam Topics cols:', Object.keys(et?.[0] || {}));
}

checkJunctionCols().catch(console.error);
