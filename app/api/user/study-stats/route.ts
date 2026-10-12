import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const authHeader = req.headers.get('authorization');

    const admin: any = getSupabaseAdmin();
    let userId: string | null = searchParams.get('userId');

    if (!userId && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      // Return unauthenticated baseline (0 metrics)
      return NextResponse.json({
        success: true,
        stats: {
          streakDays: 0,
          completedHoursToday: 0,
          targetHours: 2,
          readinessPercentage: 0,
          questionsSolved: 0,
          correctAnswers: 0,
          overallAccuracy: 0,
          recentActivities: [],
          subjectMastery: [],
          weaknessGap: null,
          sevenDayConsistency: [false, false, false, false, false, false, false],
        },
      });
    }

    // 1. Fetch study preferences
    const { data: pref } = await admin
      .from('study_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const targetHours = pref?.daily_hours ? Number(pref.daily_hours) : 2.0;

    // 2. Fetch MCQ attempts for this user
    let mcqQuery = admin
      .from('mcq_attempts')
      .select(`
        id,
        mcq_id,
        is_correct,
        response_time_ms,
        created_at,
        mcqs (
          id,
          question,
          difficulty,
          topic_id,
          subject_id,
          exam_id,
          tags,
          metadata
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: attempts } = await mcqQuery;

    const allAttempts = attempts || [];
    const filteredAttempts = examId
      ? allAttempts.filter((a: any) => !a.mcqs?.exam_id || a.mcqs.exam_id === examId)
      : allAttempts;

    const totalQuestions = filteredAttempts.length;
    const correctCount = filteredAttempts.filter((a: any) => a.is_correct).length;
    const overallAccuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 3. Fetch study sessions
    let sessionQuery = admin
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (examId) {
      sessionQuery = sessionQuery.eq('exam_id', examId);
    }

    const { data: sessions } = await sessionQuery;
    const allSessions = sessions || [];

    // Calculate completed hours today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todaySessions = allSessions.filter((s: any) => {
      return new Date(s.completed_at).getTime() >= startOfToday;
    });

    const completedMinsToday = todaySessions.reduce((acc: number, s: any) => acc + (s.duration_mins || 0), 0);
    const completedHoursToday = +(completedMinsToday / 60).toFixed(1);

    // Calculate 7-Day Consistency & Streak
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDays: boolean[] = [];

    // Mon-Sun of current week
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
    for (let i = 0; i < 7; i++) {
      const dayOffset = i - currentDayOfWeek;
      const targetDay = new Date(now.getTime() + dayOffset * dayMs);
      const startOfDay = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate()).getTime();
      const endOfDay = startOfDay + dayMs;

      const hasActivity = allSessions.some((s: any) => {
        const t = new Date(s.completed_at).getTime();
        return t >= startOfDay && t < endOfDay;
      }) || filteredAttempts.some((a: any) => {
        const t = new Date(a.created_at).getTime();
        return t >= startOfDay && t < endOfDay;
      });

      sevenDays.push(hasActivity);
    }

    // Calculate consecutive active streak days
    let streakDays = 0;
    for (let dayBack = 0; dayBack < 30; dayBack++) {
      const checkDate = new Date(now.getTime() - dayBack * dayMs);
      const start = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()).getTime();
      const end = start + dayMs;

      const activeOnDay = allSessions.some((s: any) => {
        const t = new Date(s.completed_at).getTime();
        return t >= start && t < end;
      }) || filteredAttempts.some((a: any) => {
        const t = new Date(a.created_at).getTime();
        return t >= start && t < end;
      });

      if (activeOnDay || (dayBack === 0 && streakDays === 0)) {
        if (activeOnDay) streakDays += 1;
      } else {
        break;
      }
    }
    // Default min 1 if newly created active account
    if (streakDays === 0 && (allSessions.length > 0 || filteredAttempts.length > 0)) {
      streakDays = 1;
    }

    // 4. Calculate Readiness Index
    // Baseline readiness is computed from accuracy (60%) and question volume velocity (40%)
    let readinessPercentage = 0;
    if (totalQuestions > 0) {
      const volumeScore = Math.min(100, Math.round((totalQuestions / 100) * 100));
      readinessPercentage = Math.min(99, Math.max(15, Math.round(overallAccuracy * 0.7 + volumeScore * 0.3)));
    }

    // 5. Subject Mastery Calculation for this exam
    let subjectsList: any[] = [];
    if (examId) {
      const { data: dbSubjects } = await admin
        .from('exam_subjects')
        .select('id, name, slug, weight_percentage')
        .eq('exam_id', examId)
        .order('weight_percentage', { ascending: false });
      subjectsList = dbSubjects || [];
    }

    const subjectMastery = subjectsList.map((subj) => {
      const subjectAttempts = filteredAttempts.filter((a: any) => a.mcqs?.subject_id === subj.id);
      const subjTotal = subjectAttempts.length;
      const subjCorrect = subjectAttempts.filter((a: any) => a.is_correct).length;
      const subjAccuracy = subjTotal > 0 ? Math.round((subjCorrect / subjTotal) * 100) : 0;

      let status = 'Not Started';
      let color = 'bg-slate-300 dark:bg-slate-700';

      if (subjTotal > 0) {
        if (subjAccuracy >= 80) {
          status = 'Strong';
          color = 'bg-emerald-500';
        } else if (subjAccuracy >= 60) {
          status = 'Reinforce';
          color = 'bg-amber-500';
        } else {
          status = 'High Yield Gap';
          color = 'bg-rose-500';
        }
      }

      return {
        id: subj.id,
        name: subj.name,
        score: subjAccuracy,
        questionsDone: subjTotal,
        status,
        color,
      };
    });

    // 6. Identify Weakness Gap
    let weaknessGap = null;
    const attemptedSubjects = subjectMastery.filter((s) => s.questionsDone > 0);
    if (attemptedSubjects.length > 0) {
      const lowest = [...attemptedSubjects].sort((a, b) => a.score - b.score)[0];
      if (lowest && lowest.score < 75) {
        weaknessGap = {
          subjectName: lowest.name,
          score: lowest.score,
          message: `${lowest.name} is currently at ${lowest.score}% accuracy. Complete a 10-Q focused sprint to boost readiness.`,
        };
      }
    }

    // 7. Recent Activity formatting
    const recentActivities: any[] = [];

    // Add recent sessions
    for (const session of allSessions.slice(0, 3)) {
      recentActivities.push({
        id: session.id,
        title: `${session.questions_answered || 10}-Q Session: ${session.mode || 'Practice CBT'}`,
        type: 'CBT Practice',
        score: `${session.score_percentage || 0}% Score (${session.correct_answers || 0}/${session.questions_answered || 10})`,
        time: formatRelativeTime(session.completed_at),
        timestamp: new Date(session.completed_at).getTime(),
      });
    }

    // Add recent mcq sprints if no sessions
    if (recentActivities.length === 0 && filteredAttempts.length > 0) {
      const latestAttempt = filteredAttempts[0];
      recentActivities.push({
        id: latestAttempt.id,
        title: `MCQ Drill: ${latestAttempt.mcqs?.metadata?.high_yield_tag || (Array.isArray(latestAttempt.mcqs?.tags) ? latestAttempt.mcqs.tags[0] : null) || 'Core Practice Set'}`,
        type: 'Active Practice',
        score: latestAttempt.is_correct ? 'Correct' : 'Needs Review',
        time: formatRelativeTime(latestAttempt.created_at),
        timestamp: new Date(latestAttempt.created_at).getTime(),
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        streakDays,
        completedHoursToday,
        targetHours,
        readinessPercentage,
        questionsSolved: totalQuestions,
        correctAnswers: correctCount,
        overallAccuracy,
        recentActivities,
        subjectMastery,
        weaknessGap,
        sevenDayConsistency: sevenDays,
      },
    });
  } catch (err: any) {
    console.error('Error fetching user study stats:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to load study statistics' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, examId, durationMins, hours, questionsAnswered, correctAnswers, mode } = body;
    if (!userId || userId !== user.id) {
      return NextResponse.json({ success: false, error: 'User identity could not be verified.' }, { status: 403 });
    }
    if (!examId) {
      return NextResponse.json({ success: false, error: 'Select an exam before logging study time.' }, { status: 400 });
    }

    const calculatedMins = durationMins || (hours ? Math.round(Number(hours) * 60) : 30);
    if (!Number.isFinite(Number(calculatedMins)) || Number(calculatedMins) <= 0) {
      return NextResponse.json({ success: false, error: 'Study duration must be greater than zero.' }, { status: 400 });
    }
    const admin = getSupabaseAdmin();

    const newSession = {
      user_id: user.id,
      exam_id: examId,
      duration_mins: calculatedMins,
      questions_answered: questionsAnswered || 0,
      correct_answers: correctAnswers || 0,
      score_percentage: questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0,
      mode: mode || 'study_log',
      completed_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await admin
      .from('study_sessions')
      .insert(newSession)
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting study session:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session: inserted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'Recently';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
