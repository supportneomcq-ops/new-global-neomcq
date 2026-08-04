import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

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

    return NextResponse.json({
      success: true,
      stats: {
        totalCachedAssets: totalCachedAssets || 0,
        totalExamAliases: totalExamAliasesCount || 0,
        totalSubjectAliases: totalSubjectAliasesCount || 0,
        totalTopicAliases: totalTopicAliasesCount || 0,
      },
      examAliases: examAliases || [],
      subjectAliases: subjectAliases || [],
      topicAliases: topicAliases || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch knowledge admin stats' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, entityType, entityId, alias } = body

    const supabase = getSupabaseAdmin()

    if (action === 'add_alias') {
      if (!entityId || !alias) {
        return NextResponse.json({ error: 'Missing entityId or alias' }, { status: 400 })
      }

      const cleanAlias = alias.trim().toLowerCase()

      if (entityType === 'exam') {
        await (supabase as any).from('exam_aliases').insert({ exam_id: entityId, alias: cleanAlias })
      } else if (entityType === 'subject') {
        await (supabase as any).from('subject_aliases').insert({ subject_id: entityId, alias: cleanAlias })
      } else if (entityType === 'topic') {
        await (supabase as any).from('topic_aliases').insert({ topic_id: entityId, alias: cleanAlias })
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
