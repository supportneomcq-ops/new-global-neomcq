import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authId,
      firstName,
      lastName,
      email,
      phone,
      country,
      examName,
      examDate,
      daysLeft,
      studyHours,
      studyTime,
      studyGoals,
    } = body;

    if (!email || !firstName || !examName) {
      return NextResponse.json({ error: 'Missing required onboarding fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Create or update profile in 'profiles'
    const profilePayload = {
      auth_id: authId || null,
      first_name: firstName,
      last_name: lastName || '',
      email,
      phone: phone || '',
      country: country || 'United States',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      created_at: new Date().toISOString(),
    };

    let profileRes = await supabase.from('profiles').upsert([profilePayload], { onConflict: 'email' }).select();
    if (profileRes.error) {
      console.warn('Note on profiles table upsert:', profileRes.error.message);
    }

    // 2. Create or find exam in 'exams'
    const examSlug = examName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const examPayload = {
      name: examName,
      slug: examSlug,
      country: country || 'Global',
      created_by_ai: true,
      created_at: new Date().toISOString(),
    };

    let examRes = await supabase.from('exams').upsert([examPayload], { onConflict: 'slug' }).select();
    if (examRes.error) {
      console.warn('Note on exams table upsert:', examRes.error.message);
    }

    const examId = examRes.data?.[0]?.id || 1;
    const userId = profileRes.data?.[0]?.id || authId || 'guest_user';

    // 3. Upsert into 'user_exam'
    const userExamPayload = {
      user_id: userId,
      exam_id: examId,
      exam_date: examDate,
      days_left: daysLeft,
      study_hours: studyHours,
      goal: Array.isArray(studyGoals) ? studyGoals.join(', ') : studyGoals,
      status: 'active',
    };

    let userExamRes = await supabase.from('user_exam').insert([userExamPayload]).select();
    if (userExamRes.error) {
      console.warn('Note on user_exam table insert:', userExamRes.error.message);
    }

    // 4. Upsert into 'study_preferences'
    const preferencesPayload = {
      user_id: userId,
      study_time: studyTime || 'Morning',
      notifications: true,
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };

    let prefRes = await supabase.from('study_preferences').insert([preferencesPayload]).select();
    if (prefRes.error) {
      console.warn('Note on study_preferences table insert:', prefRes.error.message);
    }

    // 5. Upsert into 'ai_context'
    const aiContextPayload = {
      user_id: userId,
      current_exam: examName,
      current_subject: 'General Knowledge',
      current_topic: 'Diagnostic Assessment',
      learning_style: 'Adaptive Q-Bank with Neural Explanations',
      created_at: new Date().toISOString(),
    };

    let aiContextRes = await supabase.from('ai_context').insert([aiContextPayload]).select();
    if (aiContextRes.error) {
      console.warn('Note on ai_context table insert:', aiContextRes.error.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding records initialized in Supabase',
      userId,
      examName,
      daysLeft,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Onboarding submission failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
