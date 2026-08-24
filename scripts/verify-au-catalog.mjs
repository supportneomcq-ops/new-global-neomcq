import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAuCatalog() {
  const { data: auExams, error: examErr } = await supabase
    .from('exams')
    .select('id, name, slug, status, verification_status, authority_id, category_id')
    .eq('country_id', 'e3c9933a-9f4b-4f0a-b901-b03b159ff5e5');

  console.log('AU Exams count:', auExams ? auExams.length : 0);
  if (auExams && auExams.length > 0) {
    console.log('Sample AU Exams:', auExams.slice(0, 5));
  }

  const { data: auAuths } = await supabase
    .from('exam_authorities')
    .select('id, name, code, slug')
    .eq('country_id', 'e3c9933a-9f4b-4f0a-b901-b03b159ff5e5');

  console.log('AU Authorities count:', auAuths ? auAuths.length : 0);
}

verifyAuCatalog();
