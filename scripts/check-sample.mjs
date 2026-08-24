import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSampleRecords() {
  const { data: et } = await supabase.from('exam_topics').select('*').limit(3);
  console.log('Sample exam_topic:', et);

  const { data: es } = await supabase.from('exam_subjects').select('*').limit(3);
  console.log('Sample exam_subject:', es);
}

inspectSampleRecords();
