import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { safeAvg } from '@/lib/analytics-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');

    // 1. Fetch Canonical Exams
    const { data: examsData, error: eErr } = await adminClient
      .from('exams')
      .select('id, name, slug, status, question_count')
      .order('name', { ascending: true });

    if (eErr) throw eErr;
    const exams = examsData || [];

    // 2. Fetch MCQ attempts aggregated by Exam
    const { data: attemptsData } = await adminClient
      .from('mcq_attempts')
      .select('id, exam_id, subject_id, topic_id, is_correct, time_spent_seconds, user_id, created_at');

    const attempts = attemptsData || [];

    // If specific Exam selected, build Subject & Topic breakdown
    if (examId) {
      // Fetch subjects for this exam
      const { data: subjectsData } = await adminClient
        .from('exam_subjects')
        .select('id, name, exam_id')
        .eq('exam_id', examId);
      const subjects = subjectsData || [];

      const subjectIds = subjects.map((s) => s.id);
      let topics: any[] = [];
      if (subjectIds.length > 0) {
        const { data: topicsData } = await adminClient
          .from('exam_topics')
          .select('id, name, subject_id')
          .in('subject_id', subjectIds);
        topics = topicsData || [];
      }

      const examAttempts = attempts.filter((a) => a.exam_id === examId);

      const subjectStats = subjects.map((subj) => {
        const sAttempts = examAttempts.filter((a) => a.subject_id === subj.id);
        const solved = sAttempts.filter((a) => a.is_correct === true).length;
        const total = sAttempts.length;
        const accuracy = safeAvg(solved * 100, total, 1);
        const uniqueUsers = new Set(sAttempts.map((a) => a.user_id)).size;
        const avgTimeSecs = safeAvg(sAttempts.reduce((acc, c) => acc + (c.time_spent_seconds || 0), 0), total, 0);

        return {
          id: subj.id,
          name: subj.name,
          questionsAttempted: total,
          questionsSolved: solved,
          accuracy,
          activeUsers: uniqueUsers,
          avgTimeSecs,
          isWeakArea: total > 5 && accuracy < 60,
        };
      });

      const topicStats = topics.map((top) => {
        const tAttempts = examAttempts.filter((a) => a.topic_id === top.id);
        const solved = tAttempts.filter((a) => a.is_correct === true).length;
        const total = tAttempts.length;
        const accuracy = safeAvg(solved * 100, total, 1);
        const uniqueUsers = new Set(tAttempts.map((a) => a.user_id)).size;
        const avgTimeSecs = safeAvg(tAttempts.reduce((acc, c) => acc + (c.time_spent_seconds || 0), 0), total, 0);

        return {
          id: top.id,
          name: top.name,
          subjectId: top.subject_id,
          questionsAttempted: total,
          questionsSolved: solved,
          accuracy,
          activeUsers: uniqueUsers,
          avgTimeSecs,
          isWeakTopic: total > 3 && accuracy < 60,
        };
      });

      return NextResponse.json({
        success: true,
        examId,
        subjects: subjectStats,
        topics: topicStats,
      });
    }

    // Otherwise return Global Exam Ranking Table
    const examRanking = exams.map((exam) => {
      const eAttempts = attempts.filter((a) => a.exam_id === exam.id);
      const totalAttempts = eAttempts.length;
      const solved = eAttempts.filter((a) => a.is_correct === true).length;
      const accuracy = safeAvg(solved * 100, totalAttempts, 1);

      const uniqueUsers = new Set(eAttempts.map((a) => a.user_id)).size;
      const studyTimeMins = Math.round(eAttempts.reduce((acc, c) => acc + (c.time_spent_seconds || 0), 0) / 60);

      return {
        id: exam.id,
        name: exam.name,
        slug: exam.slug,
        status: exam.status,
        questionCount: exam.question_count || 0,
        activeUsers: uniqueUsers,
        questionsAttempted: totalAttempts,
        questionsSolved: solved,
        accuracy,
        studyTimeMins,
      };
    }).sort((a, b) => b.activeUsers - a.activeUsers || b.questionsAttempted - a.questionsAttempted);

    return NextResponse.json({
      success: true,
      exams: examRanking,
    });
  } catch (error: any) {
    console.error('Error fetching exam analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
