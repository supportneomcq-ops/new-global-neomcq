import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc('get_public_mcq_by_slug', {
      p_slug: slug,
    });

    if (error) {
      console.error('Error fetching public MCQ:', error);
      return NextResponse.json({ error: 'Failed to fetch MCQ' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'MCQ not found or not public' }, { status: 404 });
    }

    // Double check that correct_answer is never present in returned JSON payload
    const publicMcq = data[0];
    delete publicMcq.correct_answer;
    delete publicMcq.answer_key;

    return NextResponse.json(publicMcq, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
