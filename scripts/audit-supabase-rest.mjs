import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4enBxcnFmbGZoYXdndG56eHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzEzMzEsImV4cCI6MjEwMTI0NzMzMX0.HzAcsogz1ND64kXQ1dCDkDWLotB1Vo0lcgj4K3p4p5o';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function runJsAudit() {
  console.log('Connecting to Supabase at:', SUPABASE_URL);

  const tables = [
    'exams', 'subjects', 'topics', 'mcqs', 'notes', 'flashcards', 
    'sticky_notes', 'profiles', 'subscriptions', 'payment_orders', 
    'exam_switch_transactions', 'generation_jobs', 'ai_tutor_sessions', 
    'ai_tutor_messages', 'user_progress', 'bookmarks', 'blogs', 
    'system_settings', 'audit_logs', 'notifications'
  ];

  console.log('\n--- SUPABASE REST AUDIT ---');
  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`${table}: Error - ${error.message}`);
    } else {
      console.log(`${table}: count = ${count}`);
    }
  }

  // Check profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, full_name, role, exam_locked, created_at');
  if (profiles) {
    console.log(`\n--- PROFILES (${profiles.length}) ---`);
    console.table(profiles);
  }

  // Check exams
  const { data: exams } = await supabase.from('exams').select('id, name, slug, is_active, display_order');
  if (exams) {
    console.log(`\n--- EXAMS (${exams.length}) ---`);
    console.table(exams);
  }

  // Check blogs
  const { data: blogs } = await supabase.from('blogs').select('id, title, slug, is_published, created_at');
  if (blogs) {
    console.log(`\n--- BLOGS (${blogs.length}) ---`);
    console.table(blogs);
  }

  // Check sample mcqs
  const { data: mcqs } = await supabase.from('mcqs').select('id, topic_id, question, is_published, created_at').limit(5);
  if (mcqs) {
    console.log(`\n--- MCQS SAMPLE (${mcqs.length}) ---`);
    console.table(mcqs.map(m => ({ ...m, question: m.question?.substring(0, 40) })));
  }

  // Check generation jobs
  const { data: jobs } = await supabase.from('generation_jobs').select('id, user_id, job_type, status, created_at').limit(10);
  if (jobs) {
    console.log(`\n--- GENERATION JOBS (${jobs.length}) ---`);
    console.table(jobs);
  }
}

runJsAudit().catch(console.error);
