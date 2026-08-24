import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSetup() {
  console.log('=== INSPECTING EXISTING COUNTRIES AND GLOBAL EXAMS ===\n');

  // 1. Countries
  const { data: countries, error: countryErr } = await supabase
    .from('countries')
    .select('*');
  
  if (countryErr) console.error('Error fetching countries:', countryErr);
  else console.log('Countries in DB:', countries);

  // 2. Global Exams search
  const { data: globalExams, error: examErr } = await supabase
    .from('exams')
    .select('id, name, slug, country_id, verification_status')
    .limit(100);

  if (examErr) console.error('Error fetching exams:', examErr);
  else console.log(`Total exams currently in DB: ${globalExams?.length}`);

  // Look specifically for global exams like IELTS, PTE, NCLEX, GAMSAT, CFA, GMAT, GRE, UCAT, OET
  const searchSlugs = ['nclex-rn', 'nclex', 'ielts', 'pte-academic', 'toefl', 'gamsat', 'cfa', 'gmat', 'gre', 'ucat', 'oet', 'ucat-anz'];
  const { data: matchedExams } = await supabase
    .from('exams')
    .select('id, name, slug, country_id')
    .in('slug', searchSlugs);

  console.log('Matched global exams by slug:', matchedExams);
}

inspectSetup();
