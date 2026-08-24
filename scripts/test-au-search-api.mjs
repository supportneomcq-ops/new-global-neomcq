import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuQueries() {
  const queries = ['AMC', 'GAMSAT', 'NCLEX', 'ADC', 'LANTITE', 'UCAT', 'KAPS', 'PTE', 'IELTS', 'Engineers Australia'];

  console.log('=== TESTING SEARCH RESOLUTION FOR AUSTRALIA EXAMS ===\n');

  for (const q of queries) {
    // 1. Exam search by name or slug
    const { data: nameMatches } = await supabase
      .from('exams')
      .select('id, name, slug, status, verification_status')
      .or(`name.ilike.%${q}%,slug.ilike.%${q}%`);

    // 2. Exam search by alias
    const { data: aliasMatches } = await supabase
      .from('exam_aliases')
      .select('exam_id, alias, exams(id, name, slug)')
      .ilike('alias', `%${q}%`);

    console.log(`Query "${q}":`);
    console.log(`  Direct Name Matches (${nameMatches ? nameMatches.length : 0}):`, nameMatches ? nameMatches.map(m => m.name) : []);
    console.log(`  Alias Matches (${aliasMatches ? aliasMatches.length : 0}):`, aliasMatches ? aliasMatches.map(a => `${a.alias} -> ${a.exams ? a.exams.name : ''}`) : []);
    console.log('----------------------------------------------------');
  }
}

testAuQueries();
