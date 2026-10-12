import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureCurrentStudyPlan } from '@/lib/study-plans/ensure-current-plan';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin: any = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ensureCurrentStudyPlan(admin, user.id);
    return NextResponse.json({
      success: true,
      plan: result.plan,
      ...(result.message ? { message: result.message } : {}),
    }, { status: result.plan || !result.message ? 200 : 202 });
  } catch (error: any) {
    console.error('[Study Plan Current] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Study plan could not be loaded.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin: any = getSupabaseAdmin();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, isCompletedDay, dayNumber } = body;

    if (
      typeof planId !== 'string' ||
      !planId ||
      !Number.isInteger(dayNumber) ||
      dayNumber < 1 ||
      typeof isCompletedDay !== 'boolean'
    ) {
      return NextResponse.json({ success: false, error: 'Invalid study-plan update.' }, { status: 400 });
    }

    // Read and update only the authenticated user's own study plan.
    const { data: existing, error: readError } = await admin
      .from('study_plans')
      .select('id, plan_data')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (readError || !existing) {
      return NextResponse.json({ success: false, error: 'Study plan not found.' }, { status: 404 });
    }

    const pd = existing.plan_data || {};
    let dayFound = false;
    if (Array.isArray(pd.schedule)) {
      pd.schedule.forEach((week: any) => {
        week.days?.forEach((day: any) => {
          if (day.day === dayNumber) {
            day.completed = isCompletedDay;
            dayFound = true;
          }
        });
      });
    }

    if (!dayFound) {
      return NextResponse.json({ success: false, error: 'Study day not found in this plan.' }, { status: 404 });
    }

    const { error: updateError } = await admin
      .from('study_plans')
      .update({ plan_data: pd, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Study Plan Current] Update error:', updateError);
      return NextResponse.json({ success: false, error: 'Could not save study progress.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan_data: pd });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
