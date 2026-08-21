import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const topicId = searchParams.get('topicId')
    const userId = searchParams.get('userId')

    const supabase = getSupabaseAdmin()

    let query = (supabase as any).from('user_sticky_notes').select('*').order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (topicId) {
      query = query.eq('topic_id', topicId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: true, stickyNotes: [] })
    }

    return NextResponse.json({ success: true, stickyNotes: data || [] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, topicId, text, color = 'amber', pinned = false, size = 'md' } = body

    if (!topicId || !text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'topicId and text are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await (supabase as any)
      .from('user_sticky_notes')
      .insert({
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        topic_id: topicId,
        text: text.trim(),
        color,
        pinned,
        size,
      })
      .select('*')
      .single()

    if (error) {
      // Fallback response if table not yet migrated
      return NextResponse.json({
        success: true,
        stickyNote: {
          id: `local-${Date.now()}`,
          user_id: userId,
          topic_id: topicId,
          text: text.trim(),
          color,
          pinned,
          size,
          created_at: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json({ success: true, stickyNote: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Note id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    await (supabase as any).from('user_sticky_notes').delete().eq('id', id)

    return NextResponse.json({ success: true, message: 'Sticky note deleted' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
