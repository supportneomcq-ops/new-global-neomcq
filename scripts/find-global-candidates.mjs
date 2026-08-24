import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findExamsBySlugs() {
  const slugs = [
    'nclex-rn', 'mcat', 'lsat', 'gmat-focus-edition', 'gre-general-test',
    'cfa-level-1', 'ielts-academic', 'pte-academic', 'pte-core', 'celpip-general',
    'toefl-ibt', 'usmle-step-1', 'usmle-step-2-ck', 'casper-test'
  ];

  const { data: exams } = await supabase
    .from('exams')
    .select('id, name, slug, country_id')
    .in('slug', slugs);

  console.log('Found Exams:', exams);
}

findExamsBySlugs();
