import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getServerUserEntitlements } from '@/lib/entitlements/server-entitlements';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const entitlements = await getServerUserEntitlements(user.id);
    if (entitlements.planCode !== 'ELITE' || !entitlements.isActive) {
      return NextResponse.json(
        { error: 'Unlimited free exam switching is an exclusive Elite Annual Membership privilege.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetExamId } = body;

    if (!targetExamId || typeof targetExamId !== 'string') {
      return NextResponse.json({ error: 'Target exam ID is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Fetch user's current exam
    const { data: profile } = await admin
      .from('profiles')
      .select('id, current_exam_id')
      .eq('id', user.id)
      .maybeSingle();

    const currentExamId = profile?.current_exam_id;

    if (currentExamId === targetExamId) {
      return NextResponse.json(
        { error: 'You are already studying for this exam.' },
        { status: 400 }
      );
    }

    // 2. Fetch target exam details
    const { data: targetExam } = await admin
      .from('exams')
      .select('id, name, slug, description')
      .eq('id', targetExamId)
      .maybeSingle();

    if (!targetExam) {
      return NextResponse.json({ error: 'Target exam not found' }, { status: 404 });
    }

    // 3. Atomically switch exam for Elite user
    await admin
      .from('profiles')
      .update({
        current_exam_id: targetExam.id,
        exam_locked: false,
        exam_selected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await admin.from('user_exams').upsert(
      {
        user_id: user.id,
        exam_id: targetExam.id,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,exam_id' }
    );

    // 4. Record switch history
    await admin.from('exam_switch_history').insert({
      user_id: user.id,
      from_exam_id: currentExamId || null,
      to_exam_id: targetExam.id,
      amount: 0,
      currency: 'USD',
      payment_reference: `elite_unlimited_${Date.now()}`,
      switched_at: new Date().toISOString(),
    });

    // 5. Notify user
    await admin.from('notifications').insert({
      user_id: user.id,
      title: 'Primary Exam Updated',
      message: `Your curriculum has been switched to ${targetExam.name}. As an Elite member, you enjoy unlimited exam switching anytime.`,
      type: 'success',
      metadata: {
        exam_id: targetExam.id,
        exam_name: targetExam.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully switched primary exam to ${targetExam.name}!`,
      newExam: targetExam,
    });
  } catch (err: any) {
    console.error('Error executing Elite exam switch:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to switch exam' },
      { status: 500 }
    );
  }
}
