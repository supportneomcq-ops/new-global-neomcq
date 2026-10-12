import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence';

export async function ensureCurrentStudyPlan(
  admin: any,
  userId: string,
  requestedExamId?: string | null,
): Promise<{ plan: any | null; message?: string }> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, current_exam_id, first_name, country_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw new Error('Could not load your study profile.');
  const examId = requestedExamId || profile?.current_exam_id;
  if (!profile || !examId) return { plan: null, message: 'No active exam selected.' };

  const { data: existingPlan, error: existingPlanError } = await admin
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPlanError) throw new Error('Could not check your current study plan.');
  if (existingPlan) return { plan: existingPlan };

  const [
    { data: userExam, error: userExamError },
    { data: preferences, error: preferencesError },
    { data: examData, error: examError },
    { data: subjects, error: subjectsError },
  ] = await Promise.all([
    admin.from('user_exams').select('target_date, target_score').eq('user_id', userId).eq('exam_id', examId).limit(1).maybeSingle(),
    admin.from('study_preferences').select('daily_hours, preferred_time, learning_mode').eq('user_id', userId).maybeSingle(),
    admin.from('exams').select('id, name, short_name').eq('id', examId).maybeSingle(),
    admin.from('exam_subjects').select('id, name, slug, weight_percentage').eq('exam_id', examId).order('weight_percentage', { ascending: false }),
  ]);

  if (userExamError || preferencesError || examError || subjectsError) {
    throw new Error('Could not load the exam details needed for your study plan.');
  }
  if (!examData) return { plan: null, message: 'The selected exam could not be found.' };

  let verifiedSubjects = subjects || [];
  if (verifiedSubjects.length === 0) {
    // Existing accounts may point to a canonical exam that predates curriculum generation.
    // Repair only the user's selected exam and verify the resolved ID before using its data.
    try {
      let countryName: string | undefined;
      if (profile.country_id) {
        const { data: country } = await admin.from('countries').select('name').eq('id', profile.country_id).maybeSingle();
        countryName = country?.name || undefined;
      }
      const resolution = await resolveOrInitializeExamIntelligence({
        examQuery: examData.name,
        country: countryName,
        userId,
      });

      if (resolution?.success && resolution.exam?.id === examId) {
        const { data: repairedSubjects, error: repairError } = await admin
          .from('exam_subjects')
          .select('id, name, slug, weight_percentage')
          .eq('exam_id', examId)
          .order('weight_percentage', { ascending: false });
        if (repairError) throw repairError;
        verifiedSubjects = repairedSubjects || [];
      }
    } catch (repairError) {
      console.error('[Study Plan] Selected exam curriculum repair failed:', repairError);
    }
  }

  if (verifiedSubjects.length === 0) {
    return {
      plan: null,
      message: 'Your verified exam curriculum is still being prepared. Your personalized study plan will appear as soon as its subjects are ready.',
    };
  }

  const now = new Date();
  const targetDate = userExam?.target_date
    ? new Date(`${userExam.target_date}T00:00:00.000Z`)
    : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const totalDays = Math.max(7, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const learningDays = Math.max(2, totalDays - 5);
  const dailyHours = Number(preferences?.daily_hours) || 2.5;
  const preferredTime = preferences?.preferred_time || 'morning';
  const weeksCount = Math.max(1, Math.ceil(totalDays / 7));
  const schedule: any[] = [];
  let currentDayOffset = 0;

  for (let week = 1; week <= weeksCount; week++) {
    const isRevisionWeek = week === weeksCount;
    const assignedSubject = verifiedSubjects[(week - 1) % verifiedSubjects.length]?.name || verifiedSubjects[0].name;
    const daysInThisWeek = Math.min(7, totalDays - currentDayOffset);
    const days: any[] = [];
    const isRapidMode = preferences?.learning_mode === 'rapid' || preferences?.learning_mode === 'Rapid Learning';

    for (let dayInWeek = 1; dayInWeek <= daysInThisWeek; dayInWeek++) {
      const dayNumber = currentDayOffset + dayInWeek;
      const isLockoutPhase = dayNumber > learningDays;
      const activeTasks = isRapidMode
        ? [
            `High-Yield Rapid Revision: ${assignedSubject}`,
            `Solve 45 Accelerated MCQs for ${assignedSubject}`,
            `Review 25 Rapid Recall Flashcards for ${assignedSubject}`,
            `Review mistakes and weak areas in ${assignedSubject}`,
          ]
        : [
            `Study exam-specific notes for ${assignedSubject}`,
            `Solve 30 ${assignedSubject} MCQs with explanations`,
            `Review 15 spaced-repetition flashcards for ${assignedSubject}`,
            `Review flagged weak areas in ${assignedSubject}`,
          ];

      days.push({
        day: dayNumber,
        title: isLockoutPhase ? 'Final Mock Exam & Rapid Review' : `Day ${dayNumber}: ${assignedSubject}`,
        phase: isLockoutPhase ? 'REVISION_LOCKOUT' : 'ACTIVE_LEARNING',
        targetHours: dailyHours,
        tasks: isLockoutPhase
          ? [
              'Complete a timed mock exam using the selected exam format',
              'Review errors and revise saved notes',
              'Rapidly review unseen and marked flashcards',
            ]
          : activeTasks,
        completed: false,
      });
    }

    schedule.push({
      week,
      focus: isRevisionWeek ? 'Final Revision & Mock Drill' : assignedSubject,
      isLockoutBuffer: isRevisionWeek,
      days,
    });

    currentDayOffset += daysInThisWeek;
    if (currentDayOffset >= totalDays) break;
  }

  const startDate = now.toISOString().slice(0, 10);
  const targetDateString = targetDate.toISOString().slice(0, 10);
  const planPayload = {
    examName: examData.name,
    examShortName: examData.short_name || examData.name,
    totalDays,
    learningDays,
    lockoutBufferDays: 5,
    dailyHours,
    preferredTime,
    startDate,
    targetDate: targetDateString,
    targetScore: userExam?.target_score || 85,
    subjects: verifiedSubjects.map((subject: any) => subject.name),
    schedule,
    status: 'active',
    generatedAt: now.toISOString(),
  };

  const { data: newPlan, error: insertError } = await admin
    .from('study_plans')
    .insert({
      user_id: userId,
      exam_id: examId,
      plan_data: planPayload,
      start_date: startDate,
      end_date: targetDateString,
      is_active: true,
    })
    .select('*')
    .single();

  if (insertError || !newPlan) {
    console.error('[Study Plan] Could not persist plan:', insertError?.message);
    throw new Error('Your study plan could not be saved. Please retry.');
  }

  return { plan: newPlan };
}
