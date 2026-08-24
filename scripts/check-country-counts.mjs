import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSeedScript() {
  const { data: ukExams } = await supabase.from('exams').select('id, name, slug, country_id').eq('country_id', '53f43aaa-5d56-467b-ba77-351899847efb');
  console.log(`UK Exams in DB: ${ukExams?.length}`);

  const { data: usExams } = await supabase.from('exams').select('id, name, slug, country_id').eq('country_id', '36469683-42d0-496b-a36d-cd684ec39e1a');
  console.log(`US Exams in DB: ${usExams?.length}`);

  const { data: inExams } = await supabase.from('exams').select('id, name, slug, country_id').eq('country_id', 'be4b78da-7c2a-4f51-b8ef-f39b6be75ee2');
  console.log(`India Exams in DB: ${inExams?.length}`);
}

inspectSeedScript();
