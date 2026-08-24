import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testInsert() {
  const { data: ex } = await supabase.from('exams').select('id, slug').limit(1).single();
  const { data, error } = await supabase.from('exam_aliases').insert({
    exam_id: ex.id,
    alias: 'Test Alias'
  }).select('*');
  console.log('Inserted test alias:', { data, error });

  if (data && data[0]) {
    await supabase.from('exam_aliases').delete().eq('id', data[0].id);
    console.log('Cleaned up test alias.');
  }
}

testInsert().catch(console.error);
