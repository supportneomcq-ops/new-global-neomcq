import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createExamSwitchRazorpayOrder, EXAM_SWITCH_CONFIG } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { targetExamId, preferredCurrency } = body;

    if (!targetExamId || typeof targetExamId !== 'string') {
      return NextResponse.json({ error: 'Target exam ID is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Fetch user's current exam from profile or user_exams
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, first_name, last_name, current_exam_id, exam_locked')
      .eq('id', user.id)
      .maybeSingle();

    let currentExamId = profile?.current_exam_id;
    if (!currentExamId) {
      const { data: ue } = await admin
        .from('user_exams')
        .select('exam_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (ue?.exam_id) {
        currentExamId = ue.exam_id;
      }
    }

    if (!currentExamId) {
      return NextResponse.json(
        { error: 'No active initial exam found. Please complete onboarding first.' },
        { status: 400 }
      );
    }

    // 2. Fetch current and target exam details
    const { data: fromExam } = await admin
      .from('exams')
      .select('id, name, slug')
      .eq('id', currentExamId)
      .maybeSingle();

    const { data: toExam } = await admin
      .from('exams')
      .select('id, name, slug')
      .eq('id', targetExamId)
      .maybeSingle();

    if (!toExam) {
      return NextResponse.json({ error: 'Target exam not found in directory.' }, { status: 404 });
    }

    // 3. Prevent Same Exam Switch Rule
    if (currentExamId === targetExamId) {
      return NextResponse.json(
        { error: `You are already preparing for ${fromExam?.name || 'this exam'}.` },
        { status: 400 }
      );
    }

    // 4. Create Razorpay Order Server-Side (Server enforces $2 USD strictly)
    const razorpayOrder = await createExamSwitchRazorpayOrder({
      userId: user.id,
      fromExamId: currentExamId,
      toExamId: targetExamId,
      fromExamName: fromExam?.name || 'Previous Exam',
      toExamName: toExam.name,
      userEmail: user.email || profile?.email || '',
      preferredCurrency: preferredCurrency === 'INR' ? 'INR' : 'USD',
    });

    // 5. Store switch request in database
    const { data: switchRequest, error: reqError } = await admin
      .from('exam_switch_requests')
      .insert({
        user_id: user.id,
        from_exam_id: currentExamId,
        to_exam_id: targetExamId,
        amount: EXAM_SWITCH_CONFIG.PRICE_USD,
        currency: razorpayOrder.currency,
        status: 'payment_pending',
        razorpay_order_id: razorpayOrder.orderId,
        metadata: {
          from_exam_name: fromExam?.name || 'Previous Exam',
          to_exam_name: toExam.name,
          amount_cents: razorpayOrder.amount,
        },
      })
      .select('id')
      .single();

    if (reqError || !switchRequest) {
      console.error('Failed to record exam switch request:', reqError);
      throw new Error('Database failed to create switch request record.');
    }

    return NextResponse.json({
      success: true,
      switchRequestId: switchRequest.id,
      orderId: razorpayOrder.orderId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      displayPrice: '$2.00 USD',
      keyId: razorpayOrder.keyId,
      fromExam: {
        id: currentExamId,
        name: fromExam?.name || 'Current Exam',
      },
      toExam: {
        id: toExam.id,
        name: toExam.name,
      },
    });
  } catch (err: any) {
    console.error('Error creating exam switch order:', err);
    return NextResponse.json({ error: err.message || 'Failed to initialize exam switch order.' }, { status: 500 });
  }
}
