import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSearchBehavior() {
  // Test search route logic with Supabase directly
  const { data: auExams } = await supabase
    .from('exams')
    .select('id, name, slug, country_id, verification_status, status')
    .eq('country_id', 'e3c9933a-9f4b-4f0a-b901-b03b159ff5e5');

  console.log('Current AU exams in DB:', auExams);
}

inspectSearchBehavior();
