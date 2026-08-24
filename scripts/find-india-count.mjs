import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findIndia() {
  const { data: ind } = await supabase.from('countries').select('*').or('name.ilike.%India%,iso2.eq.IN,iso3.eq.IND');
  console.log('India country:', ind);
  if (ind && ind.length > 0) {
    const { data: inExams } = await supabase.from('exams').select('id, name, slug').eq('country_id', ind[0].id);
    console.log(`India exams count: ${inExams?.length}`);
  }
}

findIndia();
