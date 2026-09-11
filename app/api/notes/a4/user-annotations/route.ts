import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notes/a4/user-annotations
 * Fetches user-specific highlights and margin notes for a given document.
 */
export async function GET(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();
    const [{ data: highlights }, { data: annotations }] = await Promise.all([
      adminClient
        .from('user_a4_highlights')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true }),
      adminClient
        .from('user_a4_annotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true }),
    ]);

    return NextResponse.json({
      documentId,
      highlights: (highlights || []).map((h) => ({
        id: h.id,
        pageNumber: h.page_number,
        sectionId: h.section_id,
        selectedText: h.selected_text,
        color: h.color,
        createdAt: h.created_at,
      })),
      annotations: (annotations || []).map((a) => ({
        id: a.id,
        pageNumber: a.page_number,
        sectionId: a.section_id,
        noteText: a.note_text,
        createdAt: a.created_at,
      })),
    });
  } catch (error: any) {
    console.error('[API GET /api/notes/a4/user-annotations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/notes/a4/user-annotations
 * Creates a personal highlight or annotation for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      type, // 'highlight' | 'annotation'
      documentId,
      pageNumber,
      sectionId,
      selectedText,
      color = 'yellow',
      noteText,
    } = body;

    if (!documentId || !pageNumber || !sectionId || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters (documentId, pageNumber, sectionId, type)' },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();

    if (type === 'highlight') {
      if (!selectedText) {
        return NextResponse.json({ error: 'selectedText is required for highlights' }, { status: 400 });
      }

      const { data, error } = await adminClient
        .from('user_a4_highlights')
        .insert({
          user_id: user.id,
          document_id: documentId,
          page_number: pageNumber,
          section_id: sectionId,
          selected_text: selectedText,
          color,
        })
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Failed to save highlight' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        highlight: {
          id: data.id,
          pageNumber: data.page_number,
          sectionId: data.section_id,
          selectedText: data.selected_text,
          color: data.color,
          createdAt: data.created_at,
        },
      });
    } else if (type === 'annotation') {
      if (!noteText) {
        return NextResponse.json({ error: 'noteText is required for annotations' }, { status: 400 });
      }

      const { data, error } = await adminClient
        .from('user_a4_annotations')
        .insert({
          user_id: user.id,
          document_id: documentId,
          page_number: pageNumber,
          section_id: sectionId,
          note_text: noteText,
        })
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Failed to save annotation' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        annotation: {
          id: data.id,
          pageNumber: data.page_number,
          sectionId: data.section_id,
          noteText: data.note_text,
          createdAt: data.created_at,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid type parameter. Must be highlight or annotation.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API POST /api/notes/a4/user-annotations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/notes/a4/user-annotations
 * Deletes a personal highlight or annotation by ID for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'highlight' | 'annotation'

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type parameter' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();
    const table = type === 'highlight' ? 'user_a4_highlights' : 'user_a4_annotations';

    const { error } = await adminClient
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[API DELETE /api/notes/a4/user-annotations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
