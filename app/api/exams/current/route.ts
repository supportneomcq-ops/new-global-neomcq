import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, authenticated: false, currentExam: null }, { status: 200 });
    }

    const admin = getSupabaseAdmin();

    // 1. Fetch user's profile with current_exam_id and lock state
    const { data: profile } = await (admin as any)
      .from('profiles')
      .select('id, email, first_name, last_name, current_exam_id, exam_locked, exam_selected_at, exam_switch_count')
      .eq('id', user.id)
      .maybeSingle();

    let currentExamId = profile?.current_exam_id;
    let isLocked = profile?.exam_locked !== false; // default true for Free users

    // Fallback 1: If current_exam_id is not set on profile yet, check user_exams table
    if (!currentExamId) {
      const { data: userExam } = await (admin as any)
        .from('user_exams')
        .select('exam_id, created_at, target_date, target_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userExam?.exam_id) {
        currentExamId = userExam.exam_id;
        // Sync back to profile
        await (admin as any)
          .from('profiles')
          .update({
            current_exam_id: currentExamId,
            exam_locked: true,
            exam_selected_at: userExam.created_at || new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    }

    // Fallback 2: Check user_metadata if onboarding was stored in auth metadata
    if (!currentExamId) {
      const metaExam = user.user_metadata?.exam_id || user.user_metadata?.exam;
      if (metaExam) {
        // Try finding exam by id or name
        const { data: metaExamData } = await (admin as any)
          .from('exams')
          .select('id')
          .or(`id.eq.${metaExam},slug.ilike.${metaExam},name.ilike.%${metaExam}%`)
          .limit(1)
          .maybeSingle();

        if (metaExamData?.id) {
          currentExamId = metaExamData.id;
          await (admin as any)
            .from('profiles')
            .update({
              current_exam_id: currentExamId,
              exam_locked: true,
              exam_selected_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          await (admin as any)
            .from('user_exams')
            .upsert({
              user_id: user.id,
              exam_id: currentExamId,
              target_date: user.user_metadata?.target_date || '2026-12-09',
              target_score: user.user_metadata?.target_score || 85,
              status: 'in_progress',
            }, { onConflict: 'user_id,exam_id' });
        }
      }
    }

    // 2. Fetch current exam details
    let currentExam: any = null;
    if (currentExamId) {
      const { data: examData } = await (admin as any)
        .from('exams')
        .select(`
          id,
          name,
          slug,
          short_name,
          description,
          difficulty,
          question_count,
          time_limit_mins,
          countries(name, iso2, flag_emoji),
          exam_categories(name, slug)
        `)
        .eq('id', currentExamId)
        .maybeSingle();
      
      currentExam = examData;
    }

    // 3. Fetch user_exam details (target date & score)
    let userExamDetails: any = null;
    if (currentExamId) {
      const { data: uEx } = await (admin as any)
        .from('user_exams')
        .select('target_date, target_score, status, created_at')
        .eq('user_id', user.id)
        .eq('exam_id', currentExamId)
        .maybeSingle();
      userExamDetails = uEx;
    }

    // 4. Fetch active subscription status
    const { data: sub } = await (admin as any)
      .from('subscriptions')
      .select('id, status, plan_id, subscription_plans(name, slug)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const isPaidUnlimited = sub && (
      (sub as any).subscription_plans?.slug?.includes('pro') ||
      (sub as any).subscription_plans?.slug?.includes('unlimited')
    );
    
    if (isPaidUnlimited) {
      isLocked = false;
    }

    // 5. Fetch exam switch history
    const { data: switchHistory } = await (admin as any)
      .from('exam_switch_history')
      .select('id, from_exam_id, to_exam_id, amount, currency, payment_reference, switched_at')
      .eq('user_id', user.id)
      .order('switched_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      currentExam,
      currentExamId,
      targetDate: userExamDetails?.target_date || null,
      targetScore: userExamDetails?.target_score || null,
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
