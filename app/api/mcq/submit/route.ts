import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mcqId, selectedIndex, selectedOption } = body ?? {};

    if (
      typeof mcqId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mcqId)
    ) {
      return NextResponse.json({ success: false, error: 'A valid mcqId is required' }, { status: 400 });
    }

    const hasIndex = selectedIndex !== undefined && selectedIndex !== null;
    const hasOption = typeof selectedOption === 'string' && selectedOption.trim().length > 0;
    if (!hasIndex && !hasOption) {
      return NextResponse.json(
        { success: false, error: 'Either selectedIndex or selectedOption must be provided' },
        { status: 400 }
      );
    }
    if (hasIndex && (!Number.isInteger(Number(selectedIndex)) || Number(selectedIndex) < 0 || Number(selectedIndex) > 25)) {
      return NextResponse.json({ success: false, error: 'selectedIndex is invalid' }, { status: 400 });
    }

    // Resolve identity only from a verified session or bearer token.
    let user: { id: string; email?: string } | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      if (token) {
        const { data, error } = await getSupabaseClient().auth.getUser(token);
        if (!error && data.user) user = { id: data.user.id, email: data.user.email };
      }
    } else {
      const sessionClient = await createClient();
      const { data, error } = await sessionClient.auth.getUser();
      if (!error && data.user) user = { id: data.user.id, email: data.user.email };
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Please sign in to submit an answer.' }, { status: 401 });
    }

    const adminClient = getSupabaseAdmin();
    const { data: mcq, error: mcqError } = await adminClient
      .from('mcqs')
      .select('id, status, visibility, user_id, options, correct_answer, explanation, rationale, clinical_pearl')
      .eq('id', mcqId)
      .maybeSingle();

    if (mcqError) {
      console.error('Could not resolve MCQ before answer submission:', mcqError);
      return NextResponse.json({ success: false, error: 'Could not verify this question.' }, { status: 500 });
    }
    if (!mcq) {
      return NextResponse.json({ success: false, error: 'MCQ not found' }, { status: 404 });
    }

    const isPublicApproved =
      mcq.status === 'approved' &&
      ['PUBLIC_CANONICAL', 'PUBLIC_DISCOVERABLE'].includes(String(mcq.visibility));
    const isOwner = mcq.user_id === user.id;
    let isAdmin = false;
    if (!isPublicApproved && !isOwner) {
      const adminAuth = await verifyAdminApiSession();
      isAdmin = Boolean(adminAuth.authorized);
    }
    if (!isPublicApproved && !isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'This question is not available for your practice account.' },
        { status: 403 }
      );
    }

    const options = Array.isArray(mcq.options) ? mcq.options : [];
    let chosenIndex: number;
    let chosenOption: string;

    if (hasIndex) {
      chosenIndex = Number(selectedIndex);
      if (chosenIndex < 0 || chosenIndex >= options.length) {
        return NextResponse.json({ success: false, error: 'selectedIndex is out of range' }, { status: 400 });
      }
      chosenOption = String(options[chosenIndex]);
    } else {
      chosenOption = selectedOption.trim();
      chosenIndex = options.findIndex((option: unknown) => String(option).trim().toLowerCase() === chosenOption.toLowerCase());
      if (chosenIndex < 0) {
        return NextResponse.json({ success: false, error: 'Selected option is not valid for this question' }, { status: 400 });
      }
    }

    const correctAnswer = typeof mcq.correct_answer === 'string' ? mcq.correct_answer : '';
    if (!correctAnswer) {
      return NextResponse.json({ success: false, error: 'This question is awaiting answer verification.' }, { status: 409 });
    }
    const isCorrect = chosenOption.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    // Service-role writes are safe here because the user and question access were verified above.
    const { error: attemptError } = await adminClient.from('mcq_attempts').insert({
      user_id: user.id,
      mcq_id: mcqId,
      selected_option: chosenOption,
      selected_index: chosenIndex,
      is_correct: isCorrect,
    });

    if (attemptError) {
      console.error('Could not save MCQ attempt:', attemptError);
      return NextResponse.json({ success: false, error: 'Your answer could not be saved. Please retry.' }, { status: 500 });
    }

    // Answer key and rationale are disclosed only after this authenticated submission.
    return NextResponse.json({
      success: true,
      is_correct: isCorrect,
      correct_answer: correctAnswer,
      explanation: mcq.explanation || mcq.rationale || '',
      clinical_pearl: mcq.clinical_pearl || '',
    });
  } catch (err: unknown) {
    console.error('MCQ answer submission failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
