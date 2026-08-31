import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('=== INSPECTING DATABASE ===');

  // Check auth users
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  console.log('Auth Users count:', authUsers?.users?.length, 'Error:', authErr);
  if (authUsers?.users) {
    console.log('Auth Users:');
    authUsers.users.forEach((u) => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Created: ${u.created_at}, Metadata:`, u.user_metadata);
    });
  }

  // Check user_profiles or profiles
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  console.log('Profiles count:', profiles?.length, 'Error:', profErr);
  if (profiles) {
    console.log('Profiles:', profiles);
  }

  // Check exams
  const { data: exams, error: examsErr } = await supabase.from('exams').select('id, name, slug, code, country_code, status, created_by_ai');
  console.log('Exams count:', exams?.length, 'Error:', examsErr);
  if (exams) {
    const testExams = exams.filter((e) => 
      e.name.toLowerCase().includes('test') || 
      e.name.toLowerCase().includes('preseeded') || 
      e.name.toLowerCase().includes('empty') ||
      e.name.toLowerCase().includes('shopping')
    );
    console.log('Test/Mock Exam count:', testExams.length);
    console.log('Sample Test Exams:', testExams.slice(0, 10));
    console.log('Legitimate Exams sample:', exams.filter(e => !testExams.includes(e)).slice(0, 10));
  }

  // Check user_exams
  const { data: userExams, error: ueErr } = await supabase.from('user_exams').select('*, exams(*)');
  console.log('User Exams count:', userExams?.length, 'Error:', ueErr);
  console.log('User Exams:', userExams);

  // Check user_study_plans
  const { data: studyPlans, error: spErr } = await supabase.from('user_study_plans').select('*');
  console.log('User Study Plans count:', studyPlans?.length, 'Error:', spErr);

  // Check study_preferences
  const { data: studyPrefs, error: prefErr } = await supabase.from('study_preferences').select('*');
  console.log('Study Preferences count:', studyPrefs?.length, 'Error:', prefErr);
}

inspect().catch(console.error);
