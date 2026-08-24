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

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = (supabase as any)
      .from('exams')
      .select(`
        id,
        name,
        slug,
        short_name,
        description,
        difficulty,
        question_count,
        time_limit_mins,
        is_featured,
        created_by_ai,
        status,
        verification_status,
        official_url,
        official_notification_url,
        official_syllabus_url,
        exam_type,
        level,
        mode,
        duration,
        total_marks,
        passing_criteria,
        eligibility,
        languages,
        version_year,
        is_current,
        created_at,
        updated_at,
        countries(id, name, iso2, flag_emoji),
        exam_categories(id, name, slug),
        exam_subjects(
          id,
          name,
          weight_percentage,
          exam_topics(id, name, importance)
        )
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    const { data: exams, error } = await query

    if (error) {
      console.error('Database query error in /api/admin/exams:', error)
      return NextResponse.json({ error: `Database Query Error: ${error.message}` }, { status: 500 })
    }

    // Fetch user enrollments per exam for accurate user counts
    const { data: userExams, error: ueError } = await (supabase as any)
      .from('user_exams')
      .select('exam_id')

    if (ueError) {
      console.error('Error fetching user_exams count in /api/admin/exams:', ueError)
    }

    const userCountMap: Record<string, number> = {}
    if (userExams) {
      userExams.forEach((ue: any) => {
        userCountMap[ue.exam_id] = (userCountMap[ue.exam_id] || 0) + 1
      })
    }

    const enrichedExams = (exams || []).map((e: any) => {
      const subjectCount = e.exam_subjects?.length || 0
      const topicCount = e.exam_subjects?.reduce((acc: number, s: any) => acc + (s.exam_topics?.length || 0), 0) || 0
      return {
        ...e,
        subject_count: subjectCount,
        topic_count: topicCount,
        user_count: userCountMap[e.id] || 0,
      }
    })

    // Get statistics
    const totalExams = enrichedExams.length
    const activeExams = enrichedExams.filter((e: any) => e.status === 'active' || e.status === 'published').length
    const archivedExams = enrichedExams.filter((e: any) => e.status === 'archived' || e.status === 'inactive').length
    const pendingReviewCount = enrichedExams.filter((e: any) => e.verification_status === 'pending' || e.verification_status === 'unverified').length

    return NextResponse.json({
      success: true,
      stats: {
        totalExams,
        activeExams,
        archivedExams,
        pendingReviewCount,
      },
      exams: enrichedExams,
    })
  } catch (err: any) {
    console.error('Server error in GET /api/admin/exams:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { name, description, category_id, country_id, difficulty, question_count, time_limit_mins, official_website, is_featured, aliases } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Exam name is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Run Duplicate Recognition Check using Knowledge Engine
    const match = await matchExamSmart(supabase, name)
    if (match.matched && match.confidence >= 85) {
      return NextResponse.json({
        error: `Duplicate exam detected! Matches canonical exam "${match.canonicalName}" (${match.normalizedSlug}) with ${match.confidence}% confidence (${match.matchType} match). Creation blocked.`,
        duplicate: match.entity,
        matchType: match.matchType,
      }, { status: 409 })
    }

    const norm = normalizeInput(name)
    const slug = norm.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check if slug exists
    const { data: existingSlug } = await (supabase as any)
      .from('exams')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      return NextResponse.json({
        error: `Exam with slug "${slug}" already exists (${existingSlug.name}).`,
        duplicate: existingSlug,
      }, { status: 409 })
    }

    const parsedAliases = Array.isArray(aliases)
      ? aliases.map((a: string) => a.trim()).filter(Boolean)
      : typeof aliases === 'string'
      ? aliases.split(',').map((a) => a.trim()).filter(Boolean)
      : []

    // 2. Insert Canonical Exam using correct table schema
    const { data: newExam, error: createError } = await (supabase as any)
      .from('exams')
      .insert({
        name: name.trim(),
        slug,
        description: description || '',
        category_id: category_id || null,
        country_id: country_id || null,
        difficulty: difficulty || 'Adaptive',
        question_count: parseInt(question_count, 10) || 100,
        time_limit_mins: parseInt(time_limit_mins, 10) || 120,
        official_url: official_website || null,
        is_featured: !!is_featured,
        status: 'active',
        verification_status: 'verified',
        created_by_ai: false,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // 3. Register Exam Aliases in exam_aliases table
    if (parsedAliases.length > 0) {
      const aliasInserts = parsedAliases.map((a: string) => ({
        exam_id: newExam.id,
        alias: a.toLowerCase(),
      }))
      await (supabase as any).from('exam_aliases').upsert(aliasInserts, { onConflict: 'exam_id,alias' })
    }

    return NextResponse.json({ success: true, exam: newExam, message: 'Exam created successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const body = await req.json()
    const { examId, name, description, category_id, country_id, verification_status, is_featured, status, difficulty, question_count, time_limit_mins, official_website, aliases } = body

    if (!examId) {
      return NextResponse.json({ error: 'Missing examId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const updateData: any = { updated_at: new Date().toISOString() }

    if (name) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description
    if (category_id !== undefined) updateData.category_id = category_id || null
    if (country_id !== undefined) updateData.country_id = country_id || null
    if (verification_status) updateData.verification_status = verification_status
    if (typeof is_featured === 'boolean') updateData.is_featured = is_featured
    if (status) updateData.status = status
    if (difficulty) updateData.difficulty = difficulty
    if (question_count) updateData.question_count = parseInt(question_count, 10)
    if (time_limit_mins) updateData.time_limit_mins = parseInt(time_limit_mins, 10)
    if (official_website !== undefined) updateData.official_url = official_website

    const { data: updated, error } = await (supabase as any)
      .from('exams')
      .update(updateData)
      .eq('id', examId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (aliases !== undefined) {
      const parsedAliases = Array.isArray(aliases)
        ? aliases.map((a: string) => a.trim()).filter(Boolean)
        : typeof aliases === 'string'
        ? aliases.split(',').map((a) => a.trim()).filter(Boolean)
        : []

      if (parsedAliases.length > 0) {
        const aliasInserts = parsedAliases.map((a: string) => ({
          exam_id: examId,
          alias: a.toLowerCase(),
        }))
        await (supabase as any).from('exam_aliases').upsert(aliasInserts, { onConflict: 'exam_id,alias' })
      }
    }

    return NextResponse.json({ success: true, exam: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(req.url)
    const examId = searchParams.get('id')

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Soft delete / archive exam
    const { error } = await (supabase as any)
      .from('exams')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', examId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Exam archived successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}


