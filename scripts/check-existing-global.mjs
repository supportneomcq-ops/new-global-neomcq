import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGlobalExams() {
  const { data: allExams } = await supabase.from('exams').select('id, name, slug, country_id, verification_status');
  console.log('Total exams in DB:', allExams?.length);
  
  const searchSlugs = [
    'ielts', 'pte-academic', 'toefl', 'gamsat', 'cfa', 'gmat', 'gre', 'ucat', 'oet',
    'nclex-rn', 'nclex', 'ca-anz', 'cpa-australia', 'gamsat', 'ucat-anz'
  ];

  const matched = (allExams || []).filter(e => searchSlugs.some(s => e.slug.includes(s) || e.name.toLowerCase().includes(s)));
  console.log('Matched existing exams:', matched);

  const { data: aliases } = await supabase.from('exam_aliases').select('id, exam_id, alias');
  console.log('Total exam aliases in DB:', aliases?.length);
  const matchedAliases = (aliases || []).filter(a => searchSlugs.some(s => a.alias.toLowerCase().includes(s)));
  console.log('Matched aliases:', matchedAliases);
}

checkGlobalExams();
