import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as any)
      .from('ai_discovered_exams')
      .select(`
        *,
        countries (
          name,
          iso2,
          flag_emoji
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Admin GET AI Discovered Exams Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch AI discovered exams' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, verification_status, promote_to_platform } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: record, error: fetchErr } = await (supabase as any)
      .from('ai_discovered_exams')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    const updates: any = {
      verification_status: verification_status || record.verification_status,
      updated_at: new Date().toISOString(),
    };

    if (promote_to_platform && record.promoted_to_exam_id) {
      await (supabase as any)
        .from('exams')
        .update({
          verification_status: 'verified',
          is_featured: true,
        })
        .eq('id', record.promoted_to_exam_id);

      updates.verification_status = 'verified';
    }

    const { data: updatedRecord, error: updateErr } = await (supabase as any)
      .from('ai_discovered_exams')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      data: updatedRecord,
    });
  } catch (error: any) {
    console.error('Admin PATCH AI Discovered Exams Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update record' },
      { status: 500 }
    );
  }
}
