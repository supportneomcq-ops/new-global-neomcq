import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const exam_id = searchParams.get('exam_id') || '';
    const search = searchParams.get('search') || '';

    let query = (supabase as any)
      .from('study_plans')
      .select(
        `
        *,
        exams(id, name, slug),
        profiles(id, email, full_name)
      `
      )
      .order('created_at', { ascending: false });

    if (exam_id && exam_id !== 'all') query = query.eq('exam_id', exam_id);

    const { data: plans, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = (plans || []).filter((p: any) => {
      if (!search) return true;
      const term = search.toLowerCase();
      const examName = p.exams?.name?.toLowerCase() || '';
      const userEmail = p.profiles?.email?.toLowerCase() || '';
      return examName.includes(term) || userEmail.includes(term);
    });

    return NextResponse.json({
      success: true,
      study_plans: filtered,
      stats: {
        total: plans?.length || 0,
        active: plans?.filter((p: any) => p.is_active).length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { exam_id, user_id, plan_data, start_date, end_date } = body;

    if (!exam_id) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });
    }

    const { data: plan, error } = await (supabase as any)
      .from('study_plans')
      .insert({
        exam_id,
        user_id: user_id || auth.user?.id,
        plan_data: plan_data || { title: 'High-Yield Revision Plan', weeks: [] },
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || new Date(Date.now() + 30 * 86400000).toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, study_plan: plan });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
