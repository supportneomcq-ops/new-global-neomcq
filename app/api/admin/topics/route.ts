import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'
import { normalizeInput } from '@/lib/knowledge/normalizer'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const examId = searchParams.get('examId')
    const subjectId = searchParams.get('subjectId')
    const search = searchParams.get('search')

    const supabase = getSupabaseAdmin()

    let query = (supabase as any)
      .from('exam_topics')
      .select(`
        *,
        exam_subjects!inner(
          id,
          name,
          exam_id,
          exams!inner(id, name, slug)
        )
      `)
      .order('created_at', { ascending: true })

    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    } else if (examId) {
      query = query.eq('exam_subjects.exam_id', examId)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: topics, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch aliases count for each topic
    const { data: topicAliases } = await (supabase as any)
      .from('topic_aliases')
      .select('topic_id')

    const aliasCountMap: Record<string, number> = {}
    if (topicAliases) {
      topicAliases.forEach((ta: any) => {
        aliasCountMap[ta.topic_id] = (aliasCountMap[ta.topic_id] || 0) + 1
      })
    }

    const enrichedTopics = (topics || []).map((t: any) => ({
      ...t,
      subject_name: t.exam_subjects?.name || 'Unassigned Subject',
      exam_name: t.exam_subjects?.exams?.name || 'Unassigned Exam',
      exam_id: t.exam_subjects?.exams?.id || '',
      alias_count: aliasCountMap[t.id] || 0,
    }))

    // Fetch Exams and Subjects lists for filters
    const [{ data: exams }, { data: subjects }] = await Promise.all([
      (supabase as any).from('exams').select('id, name, slug').neq('status', 'archived').order('name', { ascending: true }),
      (supabase as any).from('exam_subjects').select('id, name, exam_id').order('name', { ascending: true }),
    ])

    return NextResponse.json({
      success: true,
      topics: enrichedTopics,
      exams: exams || [],
      subjects: subjects || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { subject_id, name, description, level, target_weight, order_index, learning_objectives, aliases } = body

    if (!subject_id || !name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Subject ID and Topic Name are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Duplicate check under the same subject
    const norm = normalizeInput(name)
    const slug = norm.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data: existingTopics } = await (supabase as any)
      .from('exam_topics')
      .select('id, name, slug')
      .eq('subject_id', subject_id)

    if (existingTopics && existingTopics.length > 0) {
      const duplicate = existingTopics.find((t: any) => {
        const existingNorm = normalizeInput(t.name)
        return (
          t.name.toLowerCase() === name.trim().toLowerCase() ||
          t.slug === slug ||
          existingNorm.canonical === norm.canonical
        )
      })

      if (duplicate) {
        return NextResponse.json({
          error: `Topic "${duplicate.name}" already exists under this subject (normalized match: "${norm.canonical}"). Creation blocked.`,
          duplicate,
        }, { status: 409 })
      }
    }

    // 2. Insert new Topic
    const { data: newTopic, error: createError } = await (supabase as any)
      .from('exam_topics')
      .insert({
        subject_id,
        name: name.trim(),
        description: description || '',
        importance: level || 'Medium',
        verification_status: 'verified',
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // 3. Insert Aliases
    const parsedAliases = Array.isArray(aliases)
      ? aliases.map((a: string) => a.trim()).filter(Boolean)
      : typeof aliases === 'string'
      ? aliases.split(',').map((a) => a.trim()).filter(Boolean)
      : []

    if (parsedAliases.length > 0) {
      const aliasInserts = parsedAliases.map((a: string) => ({
        topic_id: newTopic.id,
        alias: a.toLowerCase(),
        source: 'Manual Admin',
        confidence: 100.0,
        status: 'approved',
      }))
      await (supabase as any).from('topic_aliases').upsert(aliasInserts, { onConflict: 'topic_id,alias' })
    }

    return NextResponse.json({ success: true, topic: newTopic, message: 'Topic created successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { topicId, name, description, level, target_weight, order_index, validation_status } = body

    if (!topicId) {
      return NextResponse.json({ error: 'Topic ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = {}

    if (name) {
      updateData.name = name.trim()
    }
    if (description !== undefined) updateData.description = description
    if (level) updateData.importance = level
    if (validation_status) updateData.verification_status = validation_status

    const { data: updated, error } = await (supabase as any)
      .from('exam_topics')
      .update(updateData)
      .eq('id', topicId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, topic: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const topicId = searchParams.get('id')

    if (!topicId) {
      return NextResponse.json({ error: 'Topic ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await (supabase as any)
      .from('exam_topics')
      .delete()
      .eq('id', topicId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Topic deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
