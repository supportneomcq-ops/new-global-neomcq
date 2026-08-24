import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkCols() {
  const { data: auth, error: authErr } = await supabase.from('exam_authorities').select('*');
  console.log('Authorities:', auth?.length, authErr || '');
  if (auth?.length) console.log(auth.map(a => `${a.code}: ${a.name} (${a.website_url || a.website})`));

  const { data: subj, error: subjErr } = await supabase.from('subjects').select('*');
  console.log('Subjects:', subj?.length, subjErr || '');
  if (subj?.length) console.log(subj.map(s => `${s.slug}: ${s.name}`).join('\n'));

  const { data: topics, error: topicErr } = await supabase.from('topics').select('*');
  console.log('Topics:', topics?.length, topicErr || '');
}

checkCols().catch(console.error);
