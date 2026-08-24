import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCanadaContext() {
  // 1. Check countries table for Canada
  const { data: countries } = await supabase.from('countries').select('*');
  console.log('All Countries:', countries?.map(c => ({ id: c.id, name: c.name, code: c.code, slug: c.slug })));

  // 2. Check existing global exams
  const globalSlugs = ['nclex-rn', 'mcat', 'lsat', 'gmat-focus-edition', 'gre-general-test', 'cfa-level-1', 'ielts-academic', 'pte-academic', 'pte-core', 'celpip-general', 'toefl-ibt'];
  const { data: existingExams } = await supabase.from('exams').select('id, name, slug, country_id').in('slug', globalSlugs);
  console.log('\nMatching Global Exams in DB:', existingExams);

  // 3. Check categories
  const { data: categories } = await supabase.from('exam_categories').select('id, name, slug');
  console.log('\nCategories:', categories);
}

checkCanadaContext();
