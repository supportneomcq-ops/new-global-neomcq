import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!email || !message) {
      return NextResponse.json({ error: 'Email and message are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Try inserting into 'contacts' table
    const { data, error } = await supabase
      .from('contacts')
      .insert([
        {
          name: name || 'Anonymous',
          email,
          message,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.warn('Supabase insert warning (contacts table may need creation or RLS rule):', error.message);
      // Even if table doesn't exist yet in Supabase schema, return success with log acknowledgment
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Message received and processed.',
        error: error.message,
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
