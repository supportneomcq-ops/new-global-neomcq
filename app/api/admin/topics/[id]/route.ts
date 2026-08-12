import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const { id: topicId } = await params

    if (!topicId) {
      return NextResponse.json({ error: 'Topic ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch Topic with parent Subject and Exam
    const { data: topic, error: tError } = await (supabase as any)
      .from('exam_topics')
      .select(`
        *,
        exam_subjects(
          id,
          name,
          slug,
          exam_id,
          exams(id, name, slug)
        )
      `)
      .eq('id', topicId)
      .single()

    if (tError || !topic) {
      return NextResponse.json({ error: tError?.message || 'Topic not found' }, { status: 404 })
    }

    // 2. Fetch Aliases
    const { data: aliases } = await (supabase as any)
      .from('topic_aliases')
      .select('*')
      .eq('topic_id', topicId)

    // 3. Fetch Learning Content Cache
    const { data: contentCache } = await (supabase as any)
      .from('learning_content_cache')
      .select('*')
      .eq('topic_id', topicId)

    return NextResponse.json({
      success: true,
      topic,
      aliases: aliases || [],
      contentCache: contentCache || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
