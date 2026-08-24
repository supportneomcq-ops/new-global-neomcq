import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExamCountriesTable() {
  const { data, error } = await supabase.from('exam_countries').select('*').limit(5);
  console.log('exam_countries table check:', data, error ? error.message : 'exists');
}

checkExamCountriesTable();
