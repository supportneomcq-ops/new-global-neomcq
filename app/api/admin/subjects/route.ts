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
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const supabase = getSupabaseAdmin()

    let query = (supabase as any)
      .from('exam_subjects')
      .select(`
        *,
        exams(id, name, slug, status, countries(name, flag_emoji)),
        exam_topics(id, name, slug, level)
      `)
      .order('order_index', { ascending: true })

    if (examId) {
      query = query.eq('exam_id', examId)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    if (status && status !== 'all') {
      query = query.eq('validation_status', status)
    }

    const { data: subjects, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enriched subjects
    const enrichedSubjects = (subjects || []).map((s: any) => ({
      ...s,
      topic_count: s.exam_topics?.length || s.topic_count || 0,
      exam_name: s.exams?.name || 'Unassigned Exam',
      exam_slug: s.exams?.slug || '',
    }))

    // Fetch exams list for filter dropdowns
    const { data: exams } = await (supabase as any)
      .from('exams')
      .select('id, name, slug')
      .neq('status', 'archived')
      .order('name', { ascending: true })

    return NextResponse.json({
      success: true,
      subjects: enrichedSubjects,
      exams: exams || [],
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
    const { exam_id, name, description, weight_percentage, order_index, aliases } = body

    if (!exam_id || !name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Exam ID and Subject Name are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Duplicate check inside the same exam (exact name, normalized name, or slug match)
    const norm = normalizeInput(name)
    const slug = norm.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data: existingSubjects } = await (supabase as any)
      .from('exam_subjects')
      .select('id, name, slug')
      .eq('exam_id', exam_id)

    if (existingSubjects && existingSubjects.length > 0) {
      const duplicate = existingSubjects.find((s: any) => {
        const existingNorm = normalizeInput(s.name)
        return (
          s.name.toLowerCase() === name.trim().toLowerCase() ||
          s.slug === slug ||
          existingNorm.canonical === norm.canonical
        )
      })

      if (duplicate) {
        return NextResponse.json({
          error: `Subject "${duplicate.name}" already exists under this exam (normalized match: "${norm.canonical}"). Creation blocked.`,
          duplicate,
        }, { status: 409 })
      }
    }

    // Also check subject aliases
    const { data: aliasMatch } = await (supabase as any)
      .from('subject_aliases')
      .select('subject_id, alias, exam_subjects(id, name, exam_id)')
      .ilike('alias', norm.canonical)
      .maybeSingle()

    if (aliasMatch && aliasMatch.exam_subjects && aliasMatch.exam_subjects.exam_id === exam_id) {
      return NextResponse.json({
        error: `Subject name matches existing alias for subject "${aliasMatch.exam_subjects.name}" in this exam. Creation blocked.`,
        duplicate: aliasMatch.exam_subjects,
      }, { status: 409 })
    }

    // 2. Insert new Subject
    const { data: newSubject, error: createError } = await (supabase as any)
      .from('exam_subjects')
      .insert({
        exam_id,
        name: name.trim(),
        slug,
        description: description || '',
        weight_percentage: parseFloat(weight_percentage) || 10.0,
        order_index: parseInt(order_index, 10) || 0,
        validation_status: 'verified',
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // 3. Insert Aliases if provided
    const parsedAliases = Array.isArray(aliases)
      ? aliases.map((a: string) => a.trim()).filter(Boolean)
      : typeof aliases === 'string'
      ? aliases.split(',').map((a) => a.trim()).filter(Boolean)
      : []

    if (parsedAliases.length > 0) {
      const aliasInserts = parsedAliases.map((a: string) => ({
        subject_id: newSubject.id,
        alias: a.toLowerCase(),
        source: 'Manual Admin',
        confidence: 100.0,
        status: 'approved',
      }))
      await (supabase as any).from('subject_aliases').upsert(aliasInserts, { onConflict: 'subject_id,alias' })
    }

    return NextResponse.json({ success: true, subject: newSubject, message: 'Subject created successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { subjectId, name, description, weight_percentage, order_index, validation_status } = body

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = {}

    if (name) {
      updateData.name = name.trim()
      const norm = normalizeInput(name)
      updateData.slug = norm.slug
    }
    if (description !== undefined) updateData.description = description
    if (weight_percentage !== undefined) updateData.weight_percentage = parseFloat(weight_percentage)
    if (order_index !== undefined) updateData.order_index = parseInt(order_index, 10)
    if (validation_status) updateData.validation_status = validation_status

    const { data: updated, error } = await (supabase as any)
      .from('exam_subjects')
      .update(updateData)
      .eq('id', subjectId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, subject: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('id')

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await (supabase as any)
      .from('exam_subjects')
      .delete()
      .eq('id', subjectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
