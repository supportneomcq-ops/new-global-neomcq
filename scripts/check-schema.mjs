import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArchitecture() {
  console.log('=== CHECKING EXISTING DB SCHEMAS AND RELATIONS ===');

  // Check columns of exams
  const { data: examSample } = await supabase.from('exams').select('*').limit(1);
  console.log('Exams columns:', examSample ? Object.keys(examSample[0] || {}) : 'empty');

  // Check columns of exam_authorities
  const { data: authSample } = await supabase.from('exam_authorities').select('*').limit(1);
  console.log('Exam Authorities columns:', authSample ? Object.keys(authSample[0] || {}) : 'empty');

  // Check columns of exam_versions
  const { data: verSample } = await supabase.from('exam_versions').select('*').limit(1);
  console.log('Exam Versions columns:', verSample ? Object.keys(verSample[0] || {}) : 'empty');

  // Check columns of subjects
  const { data: subjSample } = await supabase.from('subjects').select('*').limit(1);
  console.log('Subjects columns:', subjSample ? Object.keys(subjSample[0] || {}) : 'empty');

  // Check columns of exam_subjects
  const { data: esSample } = await supabase.from('exam_subjects').select('*').limit(1);
  console.log('Exam Subjects columns:', esSample ? Object.keys(esSample[0] || {}) : 'empty');

  // Check columns of topics
  const { data: topicSample } = await supabase.from('topics').select('*').limit(1);
  console.log('Topics columns:', topicSample ? Object.keys(topicSample[0] || {}) : 'empty');

  // Check columns of exam_topics
  const { data: etSample } = await supabase.from('exam_topics').select('*').limit(1);
  console.log('Exam Topics columns:', etSample ? Object.keys(etSample[0] || {}) : 'empty');

  // Check columns of exam_aliases
  const { data: aliasSample } = await supabase.from('exam_aliases').select('*').limit(1);
  console.log('Exam Aliases columns:', aliasSample ? Object.keys(aliasSample[0] || {}) : 'empty');
}

checkArchitecture();
