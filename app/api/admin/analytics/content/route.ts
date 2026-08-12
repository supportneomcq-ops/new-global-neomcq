import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();

    // Fetch counts and status breakdowns for all content tables
    const [mcqsRes, notesRes, flashcardsRes, revisionRes] = await Promise.all([
      adminClient.from('mcqs').select('id, status, exam_id, subject_id, created_at'),
      adminClient.from('notes').select('id, status, exam_id, subject_id, created_at'),
      adminClient.from('flashcards').select('id, status, exam_id, subject_id, created_at'),
      adminClient.from('revision_sheets').select('id, status, exam_id, subject_id, created_at'),
    ]);

    const mcqs = mcqsRes.data || [];
    const notes = notesRes.data || [];
    const flashcards = flashcardsRes.data || [];
    const revisionSheets = revisionRes.data || [];

    const getStatusBreakdown = (items: any[]) => {
      const breakdown = { total: items.length, published: 0, draft: 0, pending: 0, rejected: 0, archived: 0 };
      items.forEach((item) => {
        const s = (item.status || 'draft').toLowerCase();
        if (s === 'published' || s === 'approved') breakdown.published += 1;
        else if (s === 'draft') breakdown.draft += 1;
        else if (s === 'pending' || s === 'pending_review') breakdown.pending += 1;
        else if (s === 'rejected') breakdown.rejected += 1;
        else if (s === 'archived') breakdown.archived += 1;
        else breakdown.draft += 1;
      });
      return breakdown;
    };

    const mcqStatus = getStatusBreakdown(mcqs);
    const notesStatus = getStatusBreakdown(notes);
    const flashcardStatus = getStatusBreakdown(flashcards);
    const revisionStatus = getStatusBreakdown(revisionSheets);

    const totalAssets = mcqStatus.total + notesStatus.total + flashcardStatus.total + revisionStatus.total;
    const totalPublished = mcqStatus.published + notesStatus.published + flashcardStatus.published + revisionStatus.published;
    const totalDraft = mcqStatus.draft + notesStatus.draft + flashcardStatus.draft + revisionStatus.draft;
    const totalPending = mcqStatus.pending + notesStatus.pending + flashcardStatus.pending + revisionStatus.pending;
    const totalRejected = mcqStatus.rejected + notesStatus.rejected + flashcardStatus.rejected + revisionStatus.rejected;
    const totalArchived = mcqStatus.archived + notesStatus.archived + flashcardStatus.archived + revisionStatus.archived;

    // Content breakdown by Type
    const assetTypes = [
      { name: 'MCQs', count: mcqs.length, published: mcqStatus.published },
      { name: 'Notes', count: notes.length, published: notesStatus.published },
      { name: 'Flashcards', count: flashcards.length, published: flashcardStatus.published },
      { name: 'Revision Sheets', count: revisionSheets.length, published: revisionStatus.published },
    ];

    // Recently Generated Assets (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyGenerated = {
      mcqs: mcqs.filter(m => new Date(m.created_at) >= thirtyDaysAgo).length,
      notes: notes.filter(n => new Date(n.created_at) >= thirtyDaysAgo).length,
      flashcards: flashcards.filter(f => new Date(f.created_at) >= thirtyDaysAgo).length,
      revisionSheets: revisionSheets.filter(r => new Date(r.created_at) >= thirtyDaysAgo).length,
    };

    return NextResponse.json({
      success: true,
      summary: {
        totalAssets,
        totalPublished,
        totalDraft,
        totalPending,
        totalRejected,
        totalArchived,
      },
      statusByType: {
        mcqs: mcqStatus,
        notes: notesStatus,
        flashcards: flashcardStatus,
        revisionSheets: revisionStatus,
      },
      assetTypes,
      recentlyGenerated,
    });
  } catch (error: any) {
    console.error('Error fetching content analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
