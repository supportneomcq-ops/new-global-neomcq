import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { id: examId } = await params

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch Exam record with country & category
    const { data: exam, error: examError } = await (supabase as any)
      .from('exams')
      .select(`
        *,
        countries(id, name, iso2, flag_emoji),
        exam_categories(id, name, slug)
      `)
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: examError?.message || 'Exam not found' }, { status: 404 })
    }

    // 2. Fetch Subjects & Topics
    const { data: subjects } = await (supabase as any)
      .from('exam_subjects')
      .select(`
        *,
        exam_topics(*)
      `)
      .eq('exam_id', examId)
      .order('order_index', { ascending: true })

    // 3. Fetch Aliases
    const { data: aliases } = await (supabase as any)
      .from('exam_aliases')
      .select('*')
      .eq('exam_id', examId)

    // 4. Fetch Enrolled Users
    const { data: userExams } = await (supabase as any)
      .from('user_exams')
      .select('*, profiles(id, first_name, last_name, email, avatar_url)')
      .eq('exam_id', examId)
      .limit(50)

    // 5. Fetch AI Jobs for this exam
    const { data: aiJobs } = await (supabase as any)
      .from('ai_generation_jobs')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })
      .limit(20)

    const pendingJobs = aiJobs?.filter((j: any) => j.status === 'pending' || j.status === 'processing') || []
    const failedJobs = aiJobs?.filter((j: any) => j.status === 'failed') || []

    // 6. Fetch Study Sessions / Analytics
    const { data: sessions } = await (supabase as any)
      .from('study_sessions')
      .select('questions_answered, correct_answers, duration_mins')
      .eq('exam_id', examId)

    let totalQuestionsAnswered = 0
    let totalCorrectAnswers = 0
    let totalSessions = sessions?.length || 0

    if (sessions) {
      sessions.forEach((s: any) => {
        totalQuestionsAnswered += s.questions_answered || 0
        totalCorrectAnswers += s.correct_answers || 0
      })
    }

    const accuracy = totalQuestionsAnswered > 0 ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) : 0

    // 7. Estimate Content Counts (MCQs, Notes, Flashcards, Cache)
    const topicIds = (subjects || []).flatMap((s: any) => (s.exam_topics || []).map((t: any) => t.id))
    
    let cachedAssetsCount = 0
    if (topicIds.length > 0) {
      const { count } = await (supabase as any)
        .from('learning_content_cache')
        .select('*', { count: 'exact', head: true })
        .in('topic_id', topicIds)
      cachedAssetsCount = count || 0
    }

    return NextResponse.json({
      success: true,
      exam,
      subjects: subjects || [],
      aliases: aliases || [],
      enrolledUsers: userExams || [],
      aiJobs: {
        recent: aiJobs || [],
        pendingCount: pendingJobs.length,
        failedCount: failedJobs.length,
      },
      analytics: {
        enrolledCount: userExams?.length || 0,
        totalSessions,
        questionsSolved: totalQuestionsAnswered,
        accuracy,
        cachedAssetsCount,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
