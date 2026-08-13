import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mcqId, selectedIndex, selectedOption } = body;

    if (!mcqId) {
      return NextResponse.json(
        { success: false, error: 'mcqId is required' },
        { status: 400 }
      );
    }

    if (selectedIndex === undefined && selectedOption === undefined) {
      return NextResponse.json(
        { success: false, error: 'Either selectedIndex or selectedOption must be provided' },
        { status: 400 }
      );
    }

    // Attempt to resolve user session if authorization header is present
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Invoke server-side atomic answer verification RPC
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc('submit_mcq_answer_atomic', {
      p_user_id: userId,
      p_mcq_id: mcqId,
      p_selected_index: selectedIndex !== undefined ? Number(selectedIndex) : null,
      p_selected_option: selectedOption || null,
    });

    if (error) {
      console.error('RPC submit_mcq_answer_atomic error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to verify answer server-side' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
