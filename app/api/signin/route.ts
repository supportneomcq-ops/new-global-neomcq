import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('user_leads')
      .insert([
        {
          email,
          signed_in_at: new Date().toISOString(),
          status: 'active',
        },
      ])
      .select();

    if (error) {
      console.warn('Supabase insert warning (user_leads table):', error.message);
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Sign in processed successfully.',
      });
    }

    return NextResponse.json({
      success: true,
      saved: true,
      data,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
