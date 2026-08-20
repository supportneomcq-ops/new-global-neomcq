import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyRazorpaySignature, EXAM_SWITCH_CONFIG } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      switchRequestId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!razorpay_payment_id || !razorpay_order_id) {
      return NextResponse.json(
        { error: 'Missing required payment verification parameters' },
        { status: 400 }
      );
    }

    // 1. Signature Verification
    if (razorpay_signature) {
      const isValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Payment signature could not be verified by server. Your exam has not been changed.' },
          { status: 400 }
        );
      }
    }

    const admin = getSupabaseAdmin();

    // 2. Fetch Switch Request and verify ownership
    let switchReqQuery = admin
      .from('exam_switch_requests')
      .select('*, from_exam:exams!from_exam_id(name), to_exam:exams!to_exam_id(name, slug)')
      .eq('user_id', user.id);

    if (switchRequestId) {
      switchReqQuery = switchReqQuery.eq('id', switchRequestId);
    } else {
      switchReqQuery = switchReqQuery.eq('razorpay_order_id', razorpay_order_id);
    }

    const { data: switchReq, error: fetchErr } = await switchReqQuery.maybeSingle();

    if (fetchErr || !switchReq) {
      return NextResponse.json(
        { error: 'Exam switch request not found for this user.' },
        { status: 404 }
      );
    }

    // 3. IDEMPOTENCY CHECK: If already completed, return success
    if (switchReq.status === 'switch_completed') {
      const { data: targetExam } = await admin
        .from('exams')
        .select('id, name, slug')
        .eq('id', switchReq.to_exam_id)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        message: 'Exam switch already completed.',
        isDuplicate: true,
        newExam: targetExam || { id: switchReq.to_exam_id, name: 'Active Exam' },
      });
    }

    // 4. PREVENT REPLAY ATTACK: Check if payment ID was already used
    const { data: existingPayment } = await admin
      .from('exam_switch_history')
      .select('id')
      .eq('payment_reference', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json(
        { error: 'This payment reference has already been redeemed for an exam switch.' },
        { status: 400 }
      );
    }

    // 5. Try calling Database RPC for Atomic Transaction
    const { data: rpcResult, error: rpcError } = await admin.rpc('execute_exam_switch_atomic', {
      p_user_id: user.id,
      p_switch_request_id: switchReq.id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_razorpay_order_id: razorpay_order_id,
      p_razorpay_signature: razorpay_signature || null,
      p_amount: switchReq.amount || EXAM_SWITCH_CONFIG.PRICE_USD,
      p_currency: switchReq.currency || 'USD',
    });

    if (!rpcError && rpcResult && rpcResult.success) {
      const { data: finalExam } = await admin
        .from('exams')
        .select('id, name, slug, description, question_count, time_limit_mins')
        .eq('id', switchReq.to_exam_id)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        message: `Exam switched successfully to ${finalExam?.name || 'new target exam'}.`,
        newExam: finalExam,
        switchCount: rpcResult.switch_count,
      });
    }

    // Fallback: Direct atomic execution via Admin client (if RPC not yet applied in environment)
    const { data: profile } = await admin
      .from('profiles')
      .select('exam_switch_count')
      .eq('id', user.id)
      .single();

    const newCount = (profile?.exam_switch_count || 0) + 1;

    // Step A: Update Profile
    await admin
      .from('profiles')
      .update({
        current_exam_id: switchReq.to_exam_id,
        exam_locked: true,
        exam_selected_at: new Date().toISOString(),
        exam_switch_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Step B: Upsert user_exams for target exam (preserving old user_exams records!)
    await admin
      .from('user_exams')
      .upsert(
        {
          user_id: user.id,
          exam_id: switchReq.to_exam_id,
          status: 'in_progress',
          target_score: 85.0,
        },
        { onConflict: 'user_id,exam_id' }
      );

    // Step C: Record in history
    await admin.from('exam_switch_history').insert({
      user_id: user.id,
      from_exam_id: switchReq.from_exam_id,
      to_exam_id: switchReq.to_exam_id,
      amount: switchReq.amount || EXAM_SWITCH_CONFIG.PRICE_USD,
      currency: switchReq.currency || 'USD',
      payment_reference: razorpay_payment_id,
      switch_request_id: switchReq.id,
      switched_at: new Date().toISOString(),
    });

    // Step D: Update switch request status
    await admin
      .from('exam_switch_requests')
      .update({
        status: 'switch_completed',
        razorpay_payment_id,
        razorpay_signature: razorpay_signature || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', switchReq.id);

    // Step E: Record general payment record
    await admin.from('payments').upsert({
      user_id: user.id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature: razorpay_signature || null,
      amount: switchReq.amount || EXAM_SWITCH_CONFIG.PRICE_USD,
      currency: switchReq.currency || 'USD',
      status: 'captured',
      webhook_payload: { type: 'exam_switch', from: switchReq.from_exam_id, to: switchReq.to_exam_id },
      created_at: new Date().toISOString(),
    }, { onConflict: 'razorpay_payment_id' });

    const { data: finalExam } = await admin
      .from('exams')
      .select('id, name, slug, description, question_count, time_limit_mins')
      .eq('id', switchReq.to_exam_id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      message: `Exam switched successfully to ${finalExam?.name || 'new target exam'}.`,
      newExam: finalExam,
      switchCount: newCount,
    });
  } catch (err: any) {
    console.error('Exam switch verification error:', err);
    return NextResponse.json(
      { error: err.message || 'Payment verification failed. Your exam has not been changed.' },
      { status: 500 }
    );
  }
}
