import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkVerCols() {
  const { data } = await supabase.from('exam_versions').select('*').limit(1);
  console.log('Version cols:', Object.keys(data?.[0] || {}));
}

checkVerCols().catch(console.error);
