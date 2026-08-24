import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testSupabase() {
  console.log('Testing Supabase client...');
  const { data: exams, error: err1 } = await supabase.from('exams').select('id, name, slug').limit(5);
  if (err1) {
    console.error('Error fetching exams:', err1);
    return;
  }
  console.log('Exams found:', exams);

  const { data: authorities, error: err2 } = await supabase.from('exam_authorities').select('id, code, name');
  if (err2) {
    console.error('Error fetching authorities:', err2);
    return;
  }
  console.log('Authorities found count:', authorities?.length);
}

testSupabase();
