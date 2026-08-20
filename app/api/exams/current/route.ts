import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // 1. Fetch user's profile with current_exam_id and lock state
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, first_name, last_name, current_exam_id, exam_locked, exam_selected_at, exam_switch_count')
      .eq('id', user.id)
      .maybeSingle();

    let currentExamId = profile?.current_exam_id;
    let isLocked = profile?.exam_locked !== false; // default true for Free users

    // Fallback: If current_exam_id is not set on profile yet, check user_exams table
    if (!currentExamId) {
      const { data: userExam } = await admin
        .from('user_exams')
        .select('exam_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (userExam?.exam_id) {
        currentExamId = userExam.exam_id;
        // Sync back to profile
        await admin
          .from('profiles')
          .update({
            current_exam_id: currentExamId,
            exam_locked: true,
            exam_selected_at: userExam.created_at || new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    }

    // 2. Fetch current exam details
    let currentExam = null;
    if (currentExamId) {
      const { data: examData } = await admin
        .from('exams')
        .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
        .eq('id', currentExamId)
        .maybeSingle();
      
      currentExam = examData;
    }

    // 3. Fetch active subscription status
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, status, plan_id, subscription_plans(name, slug)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const isPaidUnlimited = sub && ((sub as any).subscription_plans?.slug?.includes('pro') || (sub as any).subscription_plans?.slug?.includes('unlimited'));
    
    // If paid plan has multi-exam privilege, exam is unlocked
    if (isPaidUnlimited) {
      isLocked = false;
    }

    // 4. Fetch exam switch history for audit
    const { data: switchHistory } = await admin
      .from('exam_switch_history')
      .select('id, from_exam_id, to_exam_id, amount, currency, payment_reference, switched_at')
      .eq('user_id', user.id)
      .order('switched_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      currentExam,
      currentExamId,
      examLocked: isLocked,
      switchCount: profile?.exam_switch_count || switchHistory?.length || 0,
      selectedAt: profile?.exam_selected_at,
      isPaidPlan: !!isPaidUnlimited,
      switchHistory: switchHistory || [],
    });
  } catch (err: any) {
    console.error('Error fetching current exam state:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
