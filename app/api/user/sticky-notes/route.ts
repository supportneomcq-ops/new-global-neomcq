import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

async function getAuthenticatedUser() {
  const sessionClient = await createClient();
  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Please sign in to access your sticky notes.' },
    { status: 401 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topicId');
    const subtopicId = searchParams.get('subtopicId');
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');

    if (!topicId) {
      return NextResponse.json({ success: true, stickyNotes: [] });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as any)
      .from('user_sticky_notes')
      .select('*')
      .eq('topic_id', topicId)
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sticky notes:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to load sticky notes.' },
        { status: 500 }
      );
    }

    // Canonical notes are shared read-only content; personal notes are always scoped to the signed-in user.
    let stickyNotes = data || [];
    if (stickyNotes.length === 0) {
      const { data: version, error: versionError } = await (supabase as any)
        .from('content_versions')
        .select('snapshot')
        .eq('asset_id', topicId)
        .eq('asset_type', 'topic')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionError) {
        console.error('Error fetching canonical sticky notes:', versionError);
        return NextResponse.json(
          { success: false, error: 'Unable to load sticky notes.' },
          { status: 500 }
        );
      }

      const canonicalSticky = version?.snapshot?.sticky_notes;
      if (Array.isArray(canonicalSticky)) {
        stickyNotes = canonicalSticky.map((note: any, index: number) => ({
          id: note.id || `canonical_${topicId}_${index}`,
          user_id: null,
          topic_id: topicId,
          subtopic_id: subtopicId,
          exam_id: examId,
          subject_id: subjectId,
          title: note.title || `${note.category ? String(note.category).replace('_', ' ').toUpperCase() : 'HIGH-YIELD'} PEARL`,
          text: note.text || '',
          category: note.category || 'high_yield',
          color: note.color || 'yellow',
          pinned: Boolean(note.pinned),
          size: 'md',
          rotation_deg: 0,
          is_ai_generated: true,
          is_canonical: true,
        }));
      }
    }

    return NextResponse.json({ success: true, stickyNotes });
  } catch (error) {
    console.error('Sticky notes GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load sticky notes.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const {
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
    } = body ?? {};

    if (typeof topicId !== 'string' || !topicId || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'topicId and text are required' },
        { status: 400 }
      );
    }

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      topic_id: topicId,
      text: text.trim(),
      color,
      pinned: Boolean(pinned),
      size: size || 'md',
      is_ai_generated: Boolean(isAiGenerated),
    };

    if (examId) insertPayload.exam_id = examId;
    if (subjectId) insertPayload.subject_id = subjectId;
    if (subtopicId) insertPayload.subtopic_id = subtopicId;
    if (typeof title === 'string') insertPayload.title = title.trim();
    if (category) insertPayload.category = category;
    if (typeof rotationDeg === 'number') insertPayload.rotation_deg = rotationDeg;

    const { data, error } = await (getSupabaseAdmin() as any)
      .from('user_sticky_notes')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Failed inserting sticky note:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to save sticky note.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, stickyNote: data });
  } catch (error) {
    console.error('Sticky notes POST failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to save sticky note.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const { id, title, text, category, color, pinned, size, rotationDeg } = body ?? {};

    if (typeof id !== 'string' || !id) {
      return NextResponse.json(
        { success: false, error: 'Sticky note ID is required' },
        { status: 400 }
      );
    }
    if (text !== undefined && (typeof text !== 'string' || !text.trim())) {
      return NextResponse.json(
        { success: false, error: 'Sticky note text cannot be empty' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updatePayload.title = typeof title === 'string' && title.trim() ? title.trim() : null;
    if (text !== undefined) updatePayload.text = text.trim();
    if (category !== undefined) updatePayload.category = category;
    if (color !== undefined) updatePayload.color = color;
    if (pinned !== undefined) updatePayload.pinned = Boolean(pinned);
    if (size !== undefined) updatePayload.size = size;
    if (rotationDeg !== undefined) updatePayload.rotation_deg = rotationDeg;

    const { data, error } = await (getSupabaseAdmin() as any)
      .from('user_sticky_notes')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Failed updating sticky note:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to update sticky note.' },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Sticky note not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, stickyNote: data });
  } catch (error) {
    console.error('Sticky notes PATCH failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to update sticky note.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Note id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await (getSupabaseAdmin() as any)
      .from('user_sticky_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Failed deleting sticky note:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to delete sticky note.' },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Sticky note not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Sticky note deleted' });
  } catch (error) {
    console.error('Sticky notes DELETE failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to delete sticky note.' },
      { status: 500 }
    );
  }
}
