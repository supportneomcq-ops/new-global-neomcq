import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listExams() {
  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, name, slug, country_id, countries(name)');

  if (error) {
    console.error('Error fetching exams:', error);
    return;
  }

  console.log(`Total Exams in DB: ${exams.length}`);
  exams.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.name}] (${e.slug}) -> Country: ${e.countries ? e.countries.name : 'Global/None'}`);
  });
}

listExams();
