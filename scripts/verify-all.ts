import { getSupabaseAdmin } from '../lib/supabase/admin';

async function main() {
  const admin = getSupabaseAdmin();

  console.log('=== 1. CHECKING EXAMS ===');
  const { data: exams, error: examsErr } = await admin
    .from('exams')
    .select('id, name, slug, short_name, category_id, country_id, status, created_by_ai')
    .order('name');
  
  if (examsErr) {
    console.error('Error fetching exams:', examsErr);
  } else {
    console.log(`Found ${exams.length} exams in database:`);
    exams.forEach(e => console.log(` - [${e.id}] ${e.name} (slug: ${e.slug}, short: ${e.short_name})`));
  }

  console.log('\n=== 2. CHECKING FMGE SPECIFICALLY ===');
  const { data: fmgeExams } = await admin
    .from('exams')
    .select('*')
    .or('slug.ilike.%fmge%,name.ilike.%fmge%,short_name.ilike.%fmge%');
  console.log('FMGE matches:', fmgeExams);

  console.log('\n=== 3. CHECKING EXAM ALIASES ===');
  const { data: aliases } = await admin
    .from('exam_aliases')
    .select('*')
    .limit(20);
  console.log(`Found ${aliases?.length || 0} aliases:`, aliases);

  console.log('\n=== 4. CHECKING SUBJECTS FOR FMGE ===');
  if (fmgeExams && fmgeExams.length > 0) {
    for (const fe of fmgeExams) {
      const { data: subjects } = await admin
        .from('exam_subjects')
        .select('id, name, slug')
        .eq('exam_id', fe.id);
      console.log(`Exam ${fe.name} (${fe.id}) has ${subjects?.length || 0} subjects:`, subjects?.map(s => s.name));
    }
  }

  console.log('\n=== 5. CHECKING STUDY PLANS TABLE & COLUMNS ===');
  const { data: studyPlans, error: spErr } = await admin
    .from('study_plans')
    .select('*')
    .limit(5);
  console.log('Study plans error:', spErr);
  console.log('Study plans sample count:', studyPlans?.length);

  console.log('\n=== 6. CHECKING AI PROVIDERS & MODELS ===');
  const { data: aiModels } = await admin
    .from('ai_model_configs')
    .select('*');
  console.log('AI Model Configs count:', aiModels?.length);
}

main().catch(console.error);
