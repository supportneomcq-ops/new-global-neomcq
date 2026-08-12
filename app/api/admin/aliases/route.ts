import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('type') // 'exam', 'subject', 'topic', or 'all'
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const supabase = getSupabaseAdmin()

    let examAliases: any[] = []
    let subjectAliases: any[] = []
    let topicAliases: any[] = []

    if (!entityType || entityType === 'all' || entityType === 'exam') {
      let q = (supabase as any).from('exam_aliases').select('*, exams(id, name, slug)').order('created_at', { ascending: false })
      if (status && status !== 'all') q = q.eq('status', status)
      if (search) q = q.ilike('alias', `%${search}%`)
      const { data } = await q
      examAliases = (data || []).map((a: any) => ({
        ...a,
        entity_type: 'exam',
        canonical_name: a.exams?.name || 'Unknown Exam',
        canonical_id: a.exam_id,
        canonical_slug: a.exams?.slug || '',
      }))
    }

    if (!entityType || entityType === 'all' || entityType === 'subject') {
      let q = (supabase as any).from('subject_aliases').select('*, exam_subjects(id, name, slug, exams(name))').order('created_at', { ascending: false })
      if (status && status !== 'all') q = q.eq('status', status)
      if (search) q = q.ilike('alias', `%${search}%`)
      const { data } = await q
      subjectAliases = (data || []).map((a: any) => ({
        ...a,
        entity_type: 'subject',
        canonical_name: `${a.exam_subjects?.name || 'Unknown'} (${a.exam_subjects?.exams?.name || 'Exam'})`,
        canonical_id: a.subject_id,
        canonical_slug: a.exam_subjects?.slug || '',
      }))
    }

    if (!entityType || entityType === 'all' || entityType === 'topic') {
      let q = (supabase as any).from('topic_aliases').select('*, exam_topics(id, name, slug, exam_subjects(name))').order('created_at', { ascending: false })
      if (status && status !== 'all') q = q.eq('status', status)
      if (search) q = q.ilike('alias', `%${search}%`)
      const { data } = await q
      topicAliases = (data || []).map((a: any) => ({
        ...a,
        entity_type: 'topic',
        canonical_name: `${a.exam_topics?.name || 'Unknown'} (${a.exam_topics?.exam_subjects?.name || 'Subject'})`,
        canonical_id: a.topic_id,
        canonical_slug: a.exam_topics?.slug || '',
      }))
    }

    const allAliases = [...examAliases, ...subjectAliases, ...topicAliases]

    // Fetch lists for select dropdowns in creation modal
    const [{ data: exams }, { data: subjects }, { data: topics }] = await Promise.all([
      (supabase as any).from('exams').select('id, name, slug').neq('status', 'archived').order('name', { ascending: true }),
      (supabase as any).from('exam_subjects').select('id, name, exam_id, exams(name)').order('name', { ascending: true }),
      (supabase as any).from('exam_topics').select('id, name, subject_id, exam_subjects(name)').order('name', { ascending: true }),
    ])

    return NextResponse.json({
      success: true,
      aliases: allAliases,
      stats: {
        total: allAliases.length,
        examAliasesCount: examAliases.length,
        subjectAliasesCount: subjectAliases.length,
        topicAliasesCount: topicAliases.length,
      },
      exams: exams || [],
      subjects: subjects || [],
      topics: topics || [],
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
    const { entity_type, entity_id, alias, source, confidence, status } = body

    if (!entity_type || !entity_id || !alias) {
      return NextResponse.json({ error: 'entity_type, entity_id, and alias string are required' }, { status: 400 })
    }

    const cleanAlias = alias.trim().toLowerCase()
    const supabase = getSupabaseAdmin()

    // Conflict Check: Check if this alias string already maps to a different entity
    let conflict: any = null

    if (entity_type === 'exam') {
      const { data: existing } = await (supabase as any)
        .from('exam_aliases')
        .select('*, exams(name)')
        .eq('alias', cleanAlias)
        .maybeSingle()

      if (existing && existing.exam_id !== entity_id) {
        conflict = `Alias "${cleanAlias}" is already assigned to exam "${existing.exams?.name}"`
      }
    } else if (entity_type === 'subject') {
      const { data: existing } = await (supabase as any)
        .from('subject_aliases')
        .select('*, exam_subjects(name)')
        .eq('alias', cleanAlias)
        .maybeSingle()

      if (existing && existing.subject_id !== entity_id) {
        conflict = `Alias "${cleanAlias}" is already assigned to subject "${existing.exam_subjects?.name}"`
      }
    } else if (entity_type === 'topic') {
      const { data: existing } = await (supabase as any)
        .from('topic_aliases')
        .select('*, exam_topics(name)')
        .eq('alias', cleanAlias)
        .maybeSingle()

      if (existing && existing.topic_id !== entity_id) {
        conflict = `Alias "${cleanAlias}" is already assigned to topic "${existing.exam_topics?.name}"`
      }
    }

    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 })
    }

    let created: any = null

    if (entity_type === 'exam') {
      const { data, error } = await (supabase as any)
        .from('exam_aliases')
        .insert({
          exam_id: entity_id,
          alias: cleanAlias,
          source: source || 'Manual Admin',
          confidence: parseFloat(confidence) || 100.0,
          status: status || 'approved',
        })
        .select()
        .single()
      if (error) throw error
      created = data
    } else if (entity_type === 'subject') {
      const { data, error } = await (supabase as any)
        .from('subject_aliases')
        .insert({
          subject_id: entity_id,
          alias: cleanAlias,
          source: source || 'Manual Admin',
          confidence: parseFloat(confidence) || 100.0,
          status: status || 'approved',
        })
        .select()
        .single()
      if (error) throw error
      created = data
    } else if (entity_type === 'topic') {
      const { data, error } = await (supabase as any)
        .from('topic_aliases')
        .insert({
          topic_id: entity_id,
          alias: cleanAlias,
          source: source || 'Manual Admin',
          confidence: parseFloat(confidence) || 100.0,
          status: status || 'approved',
        })
        .select()
        .single()
      if (error) throw error
      created = data
    }

    return NextResponse.json({ success: true, alias: created, message: 'Alias created successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { aliasId, entity_type, status, confidence } = body

    if (!aliasId || !entity_type) {
      return NextResponse.json({ error: 'aliasId and entity_type are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = {}
    if (status) updateData.status = status
    if (confidence !== undefined) updateData.confidence = parseFloat(confidence)

    let table = 'exam_aliases'
    if (entity_type === 'subject') table = 'subject_aliases'
    if (entity_type === 'topic') table = 'topic_aliases'

    const { data: updated, error } = await (supabase as any)
      .from(table)
      .update(updateData)
      .eq('id', aliasId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, alias: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const aliasId = searchParams.get('id')
    const entityType = searchParams.get('type')

    if (!aliasId || !entityType) {
      return NextResponse.json({ error: 'aliasId and entityType required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    let table = 'exam_aliases'
    if (entityType === 'subject') table = 'subject_aliases'
    if (entityType === 'topic') table = 'topic_aliases'

    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq('id', aliasId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Alias deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
