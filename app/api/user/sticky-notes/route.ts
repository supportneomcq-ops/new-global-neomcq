import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');
    const subtopicId = searchParams.get('subtopicId');
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    let userId = searchParams.get('userId');

    if (!topicId) {
      return NextResponse.json({ success: true, stickyNotes: [] });
    }

    // Attempt to resolve authenticated user if not provided in search params
    if (!userId) {
      try {
        const supabaseUserClient = await createClient();
        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (user) userId = user.id;
      } catch (_) {}
    }

    const supabase = getSupabaseAdmin();

    let query = (supabase as any)
      .from('user_sticky_notes')
      .select('*')
      .eq('topic_id', topicId);

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    query = query.order('pinned', { ascending: false }).order('created_at', { ascending: false });

    let { data, error } = await query;

    if (error) {
      // Fallback: simple query by topic_id if advanced filters fail due to schema mismatch
      const { data: fallbackData, error: fallbackError } = await (supabase as any)
        .from('user_sticky_notes')
        .select('*')
        .eq('topic_id', topicId);

      if (fallbackError) {
        console.error('Error fetching sticky notes from Supabase:', fallbackError);
        return NextResponse.json({ success: true, stickyNotes: [] });
      }
      data = fallbackData;
    }

    if (!data || data.length === 0) {
      const { data: vData } = await (supabase as any)
        .from('content_versions')
        .select('snapshot')
        .eq('asset_id', topicId)
        .eq('asset_type', 'topic')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const canonicalSticky = vData?.snapshot?.sticky_notes;
      if (Array.isArray(canonicalSticky) && canonicalSticky.length > 0) {
        const mapped = canonicalSticky.map((sn: any, idx: number) => ({
          id: sn.id || `sn_${topicId}_${idx}`,
          user_id: userId || 'anonymous',
          topic_id: topicId,
          subtopic_id: subtopicId || null,
          exam_id: examId || null,
          subject_id: subjectId || null,
          title: sn.title || `${sn.category ? String(sn.category).replace('_', ' ').toUpperCase() : 'HIGH-YIELD'} PEARL`,
          text: sn.text || '',
          category: sn.category || 'high_yield',
          color: sn.color || 'yellow',
          pinned: Boolean(sn.pinned),
          size: 'md',
          rotation_deg: 0,
          is_ai_generated: true,
          created_at: new Date().toISOString(),
        }));
        return NextResponse.json({ success: true, stickyNotes: mapped });
      }
    }

    return NextResponse.json({ success: true, stickyNotes: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      examId,
      subjectId,
      topicId,
      subtopicId,
      title,
      text,
      category = 'high_yield',
      color = 'yellow',
      pinned = false,
      size = 'md',
      rotationDeg = 0,
      isAiGenerated = false,
    } = body;

    if (!topicId || !text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'topicId and text are required' }, { status: 400 });
    }

    let targetUserId: string | null = userId || null;
    if (!targetUserId) {
      try {
        const supabaseUserClient = await createClient();
        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (user) targetUserId = user.id;
      } catch (_) {}
    }

    const supabase = getSupabaseAdmin();

    const insertPayload: any = {
      user_id: targetUserId,
      topic_id: topicId,
      text: text.trim(),
      color,
      pinned: Boolean(pinned),
      size: size || 'md',
    };

    if (examId) insertPayload.exam_id = examId;
    if (subjectId) insertPayload.subject_id = subjectId;
    if (subtopicId) insertPayload.subtopic_id = subtopicId;
    if (title) insertPayload.title = title.trim();
    if (category) insertPayload.category = category;
    if (typeof rotationDeg === 'number') insertPayload.rotation_deg = rotationDeg;
    if (typeof isAiGenerated === 'boolean') insertPayload.is_ai_generated = isAiGenerated;

    let { data, error } = await (supabase as any)
      .from('user_sticky_notes')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      // Fallback: insert with minimal columns
      const minimalPayload = {
        user_id: targetUserId,
        topic_id: topicId,
        text: text.trim(),
        color,
        pinned: Boolean(pinned),
        size: size || 'md',
      };
      const res = await (supabase as any)
        .from('user_sticky_notes')
        .insert(minimalPayload)
        .select('*')
        .single();

      if (res.error) {
        console.error('Failed inserting sticky note to Supabase:', res.error);
        return NextResponse.json({ success: false, error: res.error.message }, { status: 500 });
      }
      data = res.data;
      error = null;
    }

    return NextResponse.json({ success: true, stickyNote: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, text, category, color, pinned, size, rotationDeg } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Sticky note ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updatePayload.title = title ? title.trim() : null;
    if (text !== undefined) updatePayload.text = text.trim();
    if (category !== undefined) updatePayload.category = category;
    if (color !== undefined) updatePayload.color = color;
    if (pinned !== undefined) updatePayload.pinned = Boolean(pinned);
    if (size !== undefined) updatePayload.size = size;
    if (rotationDeg !== undefined) updatePayload.rotation_deg = rotationDeg;

    const { data, error } = await (supabase as any)
      .from('user_sticky_notes')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Failed updating sticky note in Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, stickyNote: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Note id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await (supabase as any).from('user_sticky_notes').delete().eq('id', id);

    if (error) {
      console.error('Failed deleting sticky note:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Sticky note deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
