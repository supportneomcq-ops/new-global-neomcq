import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyRazorpaySignature } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const session = await createClient();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const switchRequestId = typeof body.switchRequestId === 'string' ? body.switchRequestId : null;
    const razorpay_order_id = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const razorpay_payment_id = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const razorpay_signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : '';

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'A payment ID, order ID, and payment signature are required.' },
        { status: 400 }
      );
    }

    if (!verifyRazorpaySignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })) {
      return NextResponse.json(
        { error: 'Payment signature could not be verified. Your exam has not been changed.' },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret || keyId.startsWith('mock_')) {
      return NextResponse.json(
        { error: 'Payment verification is temporarily unavailable. Your exam has not been changed.' },
        { status: 503 }
      );
    }

    const admin = getSupabaseAdmin();
    let query = admin
      .from('exam_switch_requests')
      .select('*, from_exam:exams!from_exam_id(name), to_exam:exams!to_exam_id(name, slug)')
      .eq('user_id', user.id);
    query = switchRequestId ? query.eq('id', switchRequestId) : query.eq('razorpay_order_id', razorpay_order_id);

    const { data: switchReq, error: fetchError } = await query.maybeSingle();
    if (fetchError) {
      console.error('Could not load exam-switch request:', fetchError);
      return NextResponse.json({ error: 'Could not verify this exam-switch request.' }, { status: 500 });
    }
    if (!switchReq) {
      return NextResponse.json({ error: 'Exam switch request not found for this user.' }, { status: 404 });
    }

    if (switchReq.status === 'switch_completed') {
      if (switchReq.razorpay_payment_id !== razorpay_payment_id || switchReq.razorpay_order_id !== razorpay_order_id) {
        return NextResponse.json({ error: 'This completed switch does not match the supplied payment.' }, { status: 409 });
      }
      const { data: targetExam } = await admin.from('exams').select('id, name, slug').eq('id', switchReq.to_exam_id).maybeSingle();
      return NextResponse.json({ success: true, message: 'Exam switch already completed.', isDuplicate: true, newExam: targetExam });
    }

    if (switchReq.razorpay_order_id !== razorpay_order_id || !['payment_pending', 'payment_verified', 'pending_payment', 'processing'].includes(switchReq.status)) {
      return NextResponse.json({ error: 'This payment does not match an eligible pending exam switch.' }, { status: 400 });
    }

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
      {
        method: 'GET',
        headers: { Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64') },
        cache: 'no-store',
      }
    );
    if (!razorpayResponse.ok) {
      console.error('Razorpay payment lookup failed:', razorpayResponse.status);
      return NextResponse.json({ error: 'Razorpay could not confirm this payment. Your exam has not been changed.' }, { status: 502 });
    }

    const payment = await razorpayResponse.json();
    const expectedAmount = Number(switchReq.metadata?.amount_cents);
    if (
      payment.status !== 'captured' ||
      payment.order_id !== razorpay_order_id ||
      payment.currency !== switchReq.currency ||
      !Number.isFinite(expectedAmount) ||
      Number(payment.amount) !== expectedAmount ||
      (payment.notes?.user_id && payment.notes.user_id !== user.id)
    ) {
      return NextResponse.json(
        { error: 'Payment status, amount, currency, order, or owner did not match. Your exam has not been changed.' },
        { status: 400 }
      );
    }

    const { data: existingPayment, error: existingPaymentError } = await admin
      .from('exam_switch_history')
      .select('id, user_id')
      .eq('payment_reference', razorpay_payment_id)
      .maybeSingle();
    if (existingPaymentError) {
      console.error('Could not check payment replay:', existingPaymentError);
      return NextResponse.json({ error: 'Could not verify whether this payment was already used.' }, { status: 500 });
    }
    if (existingPayment) {
      return NextResponse.json({ error: 'This payment has already been used for an exam switch.' }, { status: 409 });
    }

    const { error: markVerifiedError } = await admin
      .from('exam_switch_requests')
      .update({ status: 'payment_verified', razorpay_payment_id, razorpay_signature })
      .eq('id', switchReq.id)
      .eq('user_id', user.id)
      .in('status', ['payment_pending', 'pending_payment', 'processing']);
    if (markVerifiedError) {
      console.error('Could not mark exam-switch payment verified:', markVerifiedError);
      return NextResponse.json({ error: 'Payment was verified but the switch could not be finalized. Contact support; do not pay again.' }, { status: 500 });
    }

    // This RPC is service-role-only; payment was independently verified above.
    const { data: rpcResult, error: rpcError } = await admin.rpc('execute_exam_switch_atomic', {
      p_user_id: user.id,
      p_switch_request_id: switchReq.id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_razorpay_order_id: razorpay_order_id,
      p_razorpay_signature: razorpay_signature,
      p_amount: switchReq.amount,
      p_currency: switchReq.currency,
    });

    if (rpcError || !rpcResult?.success) {
      console.error('Atomic exam switch failed after payment verification:', rpcError || rpcResult);
      return NextResponse.json(
        { error: 'Payment was verified but the switch needs support review. Do not pay again.' },
        { status: 500 }
      );
    }

    const { data: finalExam, error: finalExamError } = await admin
      .from('exams')
      .select('id, name, slug, description, question_count, time_limit_mins')
      .eq('id', switchReq.to_exam_id)
      .maybeSingle();
    if (finalExamError) {
      console.error('Could not load final exam details:', finalExamError);
    }

    return NextResponse.json({
      success: true,
      message: `Exam switched successfully to ${finalExam?.name || 'your new exam'}.`,
      newExam: finalExam,
      switchCount: rpcResult.switch_count,
    });
  } catch (err: unknown) {
    console.error('Exam switch verification error:', err);
    return NextResponse.json(
      { error: 'Payment verification failed. Your exam has not been changed.' },
      { status: 500 }
    );
  }
}
