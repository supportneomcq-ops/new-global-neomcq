import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { examName, email } = await req.json();

    if (!examName) {
      return NextResponse.json({ error: 'Exam name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('practice_sessions')
      .insert([
        {
          exam_name: examName,
          user_email: email || 'anonymous@neomcq.ai',
          started_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.warn('Supabase insert warning (practice_sessions table):', error.message);
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Practice session initiated.',
      });
    }

    return NextResponse.json({
      success: true,
      saved: true,
      data,
    });
  } catch (err: unknown) {
    console.error('Error in start-exam API route:', err);
    return NextResponse.json({ error: 'Failed to initiate practice session. Please try again.' }, { status: 500 });
  }
}
