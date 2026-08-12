import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'
import { matchExamSmart } from '@/lib/knowledge/matcher'
import { normalizeInput } from '@/lib/knowledge/normalizer'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const supabase = getSupabaseAdmin()

    // Fetch Entity Counts
    const [{ count: totalExams }, { count: totalSubjects }, { count: totalTopics }] = await Promise.all([
      (supabase as any).from('exams').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
      (supabase as any).from('exam_subjects').select('*', { count: 'exact', head: true }),
      (supabase as any).from('exam_topics').select('*', { count: 'exact', head: true }),
    ])

    // Fetch Aliases counts and lists
    const { data: examAliases } = await (supabase as any)
      .from('exam_aliases')
      .select('*, exams(name, slug)')
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: subjectAliases } = await (supabase as any)
      .from('subject_aliases')
      .select('*, exam_subjects(name, slug, exam_id)')
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: topicAliases } = await (supabase as any)
      .from('topic_aliases')
      .select('*, exam_topics(name, slug, subject_id)')
      .order('created_at', { ascending: false })
      .limit(100)

    // Fetch Cache Statistics
    const { count: totalCachedAssets } = await (supabase as any)
      .from('learning_content_cache')
      .select('*', { count: 'exact', head: true })

    const { count: totalExamAliasesCount } = await (supabase as any)
      .from('exam_aliases')
      .select('*', { count: 'exact', head: true })

    const { count: totalSubjectAliasesCount } = await (supabase as any)
      .from('subject_aliases')
      .select('*', { count: 'exact', head: true })

    const { count: totalTopicAliasesCount } = await (supabase as any)
      .from('topic_aliases')
      .select('*', { count: 'exact', head: true })

    // Find potential duplicate candidates for review
    const { data: allExams } = await (supabase as any)
      .from('exams')
      .select('id, name, slug, status, created_at')
      .order('name', { ascending: true })

    const duplicateCandidates: any[] = []
    if (allExams && allExams.length > 0) {
      for (let i = 0; i < allExams.length; i++) {
        for (let j = i + 1; j < allExams.length; j++) {
          const e1 = allExams[i]
          const e2 = allExams[j]
          const norm1 = normalizeInput(e1.name)
          const norm2 = normalizeInput(e2.name)

          if (
            norm1.canonical === norm2.canonical ||
            e1.slug === e2.slug ||
            (norm1.canonical.includes(norm2.canonical) && norm2.canonical.length > 3) ||
            (norm2.canonical.includes(norm1.canonical) && norm1.canonical.length > 3)
          ) {
            duplicateCandidates.push({
              source: e2,
              target: e1,
              reason: `Name/slug match: "${e1.name}" vs "${e2.name}"`,
              confidence: norm1.canonical === norm2.canonical ? 98 : 85,
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalExams: totalExams || 0,
        totalSubjects: totalSubjects || 0,
        totalTopics: totalTopics || 0,
        totalCachedAssets: totalCachedAssets || 0,
        totalExamAliases: totalExamAliasesCount || 0,
        totalSubjectAliases: totalSubjectAliasesCount || 0,
        totalTopicAliases: totalTopicAliasesCount || 0,
      },
      examAliases: examAliases || [],
      subjectAliases: subjectAliases || [],
      topicAliases: topicAliases || [],
      duplicateCandidates,
      allExams: allExams || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch knowledge admin stats' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { action, entityType, entityId, alias } = body

    const supabase = getSupabaseAdmin()

    if (action === 'test_match') {
      const { query } = body
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Search query required' }, { status: 400 })
      }

      const match = await matchExamSmart(supabase, query)
      const norm = normalizeInput(query)

      return NextResponse.json({
        success: true,
        query,
        normalized: norm,
        match,
      })
    }

    if (action === 'merge_entities') {
      const { sourceId, targetCanonicalId, entityType: mergeType } = body

      if (!sourceId || !targetCanonicalId) {
        return NextResponse.json({ error: 'sourceId and targetCanonicalId are required' }, { status: 400 })
      }

      if (sourceId === targetCanonicalId) {
        return NextResponse.json({ error: 'Cannot merge an entity into itself' }, { status: 400 })
      }

      if (mergeType === 'exam' || !mergeType) {
        // 1. Fetch Source and Target Exams
        const { data: sourceExam } = await (supabase as any).from('exams').select('*').eq('id', sourceId).single()
        const { data: targetExam } = await (supabase as any).from('exams').select('*').eq('id', targetCanonicalId).single()

        if (!sourceExam || !targetExam) {
          return NextResponse.json({ error: 'Source or Target exam not found' }, { status: 404 })
        }

        // 2. Migrate Subjects from Source Exam to Target Exam
        await (supabase as any)
          .from('exam_subjects')
          .update({ exam_id: targetCanonicalId })
          .eq('exam_id', sourceId)

        // 3. Migrate User Enrollments
        await (supabase as any)
          .from('user_exams')
          .update({ exam_id: targetCanonicalId })
          .eq('exam_id', sourceId)

        // 4. Migrate Study Sessions
        await (supabase as any)
          .from('study_sessions')
          .update({ exam_id: targetCanonicalId })
          .eq('exam_id', sourceId)

        // 5. Add Source Exam Name as new Alias for Target Exam
        const sourceNameAlias = sourceExam.name.toLowerCase().trim()
        await (supabase as any)
          .from('exam_aliases')
          .upsert({
            exam_id: targetCanonicalId,
            alias: sourceNameAlias,
            source: 'Merged Duplicate',
            confidence: 100.0,
            status: 'approved',
          }, { onConflict: 'exam_id,alias' })

        // 6. Transfer Existing Aliases from Source to Target
        await (supabase as any)
          .from('exam_aliases')
          .update({ exam_id: targetCanonicalId })
          .eq('exam_id', sourceId)

        // 7. Soft-Archive / Mark Source Exam as Merged
        await (supabase as any)
          .from('exams')
          .update({
            status: 'archived',
            description: `[MERGED INTO: ${targetExam.name} (${targetCanonicalId})] ${sourceExam.description || ''}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sourceId)

        return NextResponse.json({
          success: true,
          message: `Successfully merged "${sourceExam.name}" into canonical exam "${targetExam.name}". All references migrated and alias created.`,
        })
      }
    }

    if (action === 'add_alias') {
      if (!entityId || !alias) {
        return NextResponse.json({ error: 'Missing entityId or alias' }, { status: 400 })
      }

      const cleanAlias = alias.trim().toLowerCase()

      if (entityType === 'exam') {
        await (supabase as any).from('exam_aliases').insert({ exam_id: entityId, alias: cleanAlias, source: 'Manual Admin' })
      } else if (entityType === 'subject') {
        await (supabase as any).from('subject_aliases').insert({ subject_id: entityId, alias: cleanAlias, source: 'Manual Admin' })
      } else if (entityType === 'topic') {
        await (supabase as any).from('topic_aliases').insert({ topic_id: entityId, alias: cleanAlias, source: 'Manual Admin' })
      }

      return NextResponse.json({ success: true, message: `Alias '${cleanAlias}' added` })
    }

    if (action === 'delete_alias') {
      const { aliasId, aliasType } = body
      if (aliasType === 'exam') {
        await (supabase as any).from('exam_aliases').delete().eq('id', aliasId)
      } else if (aliasType === 'subject') {
        await (supabase as any).from('subject_aliases').delete().eq('id', aliasId)
      } else if (aliasType === 'topic') {
        await (supabase as any).from('topic_aliases').delete().eq('id', aliasId)
      }
      return NextResponse.json({ success: true, message: 'Alias removed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

