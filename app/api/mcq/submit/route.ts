import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mcqId, selectedIndex, selectedOption } = body ?? {};

    if (typeof mcqId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mcqId)) {
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

    // Resolve identity from a verified session or a verified bearer token; never trust a user ID from the body.
    let user = null as { id: string; email?: string } | null;
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
      .select('id, status, visibility, user_id')
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

    // This RPC uses service-role privileges, so the checks above must be completed first.
    const { data, error } = await adminClient.rpc('submit_mcq_answer_atomic', {
      p_user_id: user.id,
      p_mcq_id: mcqId,
      p_selected_index: hasIndex ? Number(selectedIndex) : null,
      p_selected_option: hasOption ? selectedOption.trim() : null,
    });

    if (error) {
      console.error('RPC submit_mcq_answer_atomic error:', error);
      return NextResponse.json({ success: false, error: 'Failed to verify answer server-side' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('MCQ answer submission failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
