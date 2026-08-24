import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkExamsColumns() {
  const { data } = await supabase.from('exams').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Exams columns:', Object.keys(data[0]));
    console.log('Sample exam:', data[0]);
  }
}

checkExamsColumns();
