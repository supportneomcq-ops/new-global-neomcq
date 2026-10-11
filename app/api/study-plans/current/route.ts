import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin: any = getSupabaseAdmin();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get user profile and current exam
    const { data: profile } = await admin
      .from('profiles')
      .select('id, current_exam_id, first_name')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !profile.current_exam_id) {
      return NextResponse.json({ success: true, plan: null, message: 'No active exam selected' });
    }

    const examId = profile.current_exam_id;

    // 2. Fetch existing active study plan
    const { data: existingPlan } = await admin
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('exam_id', examId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPlan) {
      return NextResponse.json({
        success: true,
        plan: existingPlan,
      });
    }

    // 3. If no plan exists, fetch user preferences, user exam details, and exam subjects to generate one
    const { data: userExam } = await admin
      .from('user_exams')
      .select('*')
      .eq('user_id', user.id)
      .eq('exam_id', examId)
      .maybeSingle();

    const { data: preferences } = await admin
      .from('study_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: examData } = await admin
      .from('exams')
      .select('id, name, short_name')
      .eq('id', examId)
      .maybeSingle();

    const { data: subjects } = await admin
      .from('exam_subjects')
      .select('id, name, slug, weight_percentage')
      .eq('exam_id', examId)
      .order('weight_percentage', { ascending: false });

    const targetDate = userExam?.target_date ? new Date(userExam.target_date) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const totalDays = Math.max(7, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const learningDays = Math.max(2, totalDays - 5); // 5-day lockout buffer
    const dailyHours = preferences?.daily_hours || 2.5;
    const preferredTime = preferences?.preferred_time || 'morning';

    const subjectList = subjects && subjects.length > 0 ? subjects : [
      { name: 'Core Foundations', weight_percentage: 25 },
      { name: 'High-Yield Clinical Concepts', weight_percentage: 25 },
      { name: 'Diagnostics & Systems', weight_percentage: 25 },
      { name: 'Pharmacology & Management', weight_percentage: 25 },
    ];

    // Build structured study plan
    const weeksCount = Math.max(1, Math.ceil(totalDays / 7));
    const generatedSchedule: any[] = [];

    let currentDayOffset = 0;
    for (let w = 1; w <= weeksCount; w++) {
      const isRevisionWeek = w === weeksCount;
      const assignedSubject = subjectList[(w - 1) % subjectList.length]?.name || 'Comprehensive Integration';

      const daysInThisWeek = Math.min(7, totalDays - currentDayOffset);
      const days = [];

      const isRapidMode = preferences?.learning_mode === 'rapid' || preferences?.learning_mode === 'Rapid Learning';

      for (let d = 1; d <= daysInThisWeek; d++) {
        const dayNumber = currentDayOffset + d;
        const isLockoutPhase = dayNumber > learningDays;

        const activeLearningTasks = isRapidMode
          ? [
              `High-Yield Rapid Revision: ${assignedSubject}`,
              `Solve 45 Accelerated MCQs & Board Traps`,
              `25 Rapid Recall Flashcards (High-Yield)`,
              `High-yield error review & Radar weaknesses`,
            ]
          : [
              `Study Core A4 Notes: ${assignedSubject}`,
              `Solve 30 Subject-specific MCQs with rationales`,
              `Complete 15 Spaced Repetition Flashcards`,
              `Review flagged weaknesses in Radar`,
            ];

        days.push({
          day: dayNumber,
          title: isLockoutPhase ? `Lockout Buffer: Mock Exam & Rapid Review` : `Day ${dayNumber}: ${assignedSubject}`,
          phase: isLockoutPhase ? 'REVISION_LOCKOUT' : 'ACTIVE_LEARNING',
          targetHours: dailyHours,
          tasks: isLockoutPhase ? [
            'Full-length timed mock CBT section (60 Qs)',
            'High-yield error review & sticky note revision',
            'Flashcard rapid recall (Unseen + Marked)',
          ] : activeLearningTasks,
          completed: false,
        });
      }

      generatedSchedule.push({
        week: w,
        focus: isRevisionWeek ? 'Final High-Yield Revision & Mock Drill' : assignedSubject,
        isLockoutBuffer: w === weeksCount,
        days,
      });

      currentDayOffset += daysInThisWeek;
      if (currentDayOffset >= totalDays) break;
    }

    const planPayload = {
      examName: examData?.name || 'Target Examination',
      examShortName: examData?.short_name || examData?.name,
      totalDays,
      learningDays,
      lockoutBufferDays: 5,
      dailyHours,
      preferredTime,
      startDate: now.toISOString().split('T')[0],
      targetDate: targetDate.toISOString().split('T')[0],
      targetScore: userExam?.target_score || 85.0,
      subjects: subjectList.map((s: any) => s.name),
      schedule: generatedSchedule,
      status: 'active',
      generatedAt: new Date().toISOString(),
    };

    // Insert new study plan
    const { data: newPlan, error: insertErr } = await admin
      .from('study_plans')
      .insert({
        user_id: user.id,
        exam_id: examId,
        plan_data: planPayload,
        start_date: now.toISOString().split('T')[0],
        end_date: targetDate.toISOString().split('T')[0],
        is_active: true,
      })
      .select('*')
      .single();

    if (insertErr || !newPlan) {
      console.error('[Study Plan Current] Insert error:', insertErr);
      return NextResponse.json(
        { success: false, error: 'Study plan could not be saved. Please retry.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: newPlan,
    });
  } catch (error: any) {
    console.error('[Study Plan Current] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get study plan' }, { status: 500 });
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

    if (typeof planId !== 'string' || !planId || !Number.isInteger(dayNumber) || dayNumber < 1 || typeof isCompletedDay !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid study-plan update.' }, { status: 400 });
    }

    // Only the authenticated owner may update a plan.
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
