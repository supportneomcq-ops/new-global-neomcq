import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchExams() {
  const terms = ['mcat', 'lsat', 'celpip', 'tef', 'tcf', 'mccqe', 'pebc', 'ndeb', 'cpa', 'casper', 'nca', 'csc', 'nppe'];
  
  for (const t of terms) {
    const { data } = await supabase
      .from('exams')
      .select('id, name, slug, country_id')
      .or(`name.ilike.%${t}%,slug.ilike.%${t}%`);
    console.log(`Term "${t}":`, data);
  }
}

searchExams();
