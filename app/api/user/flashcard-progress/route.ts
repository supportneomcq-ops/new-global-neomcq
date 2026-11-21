import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Rating = 'again' | 'good' | 'easy';

async function authenticatedUser() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ success: false, error: 'Please sign in to load flashcard progress.' }, { status: 401 });
    const deckId = new URL(req.url).searchParams.get('deckId');
    if (!deckId || !UUID.test(deckId)) return NextResponse.json({ success: false, error: 'A valid deckId is required.' }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: deck, error: deckError } = await (admin as any).from('flashcard_decks')
      .select('id,status').eq('id', deckId).maybeSingle();
    if (deckError || !deck || deck.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'Flashcard deck is unavailable.' }, { status: 404 });
    }

    const { data, error } = await (admin as any).from('user_flashcard_progress')
      .select('flashcard_id,mastery_status,last_rating,interval_days,repetitions,review_count,correct_count,due_at,last_reviewed_at')
      .eq('user_id', user.id).eq('deck_id', deckId);
    if (error) {
      console.error('[Flashcard Progress] Read failed:', error);
      return NextResponse.json({ success: false, error: 'Unable to load your flashcard progress.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, progress: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Flashcard Progress] GET failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to load flashcard progress.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ success: false, error: 'Please sign in to save flashcard progress.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { deckId, flashcardId, rating } = body ?? {};
    if (!UUID.test(String(deckId || '')) || !UUID.test(String(flashcardId || '')) ||
        !['again', 'good', 'easy'].includes(rating)) {
      return NextResponse.json({ success: false, error: 'Invalid flashcard progress parameters.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: card, error: cardError } = await (admin as any).from('flashcards')
      .select('id,deck_id,exam_id,subject_id,topic_id,subtopic_id,status')
      .eq('id', flashcardId).eq('deck_id', deckId).maybeSingle();
    if (cardError || !card || card.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'Flashcard does not belong to this approved deck.' }, { status: 404 });
    }

    const { data: existing, error: existingError } = await (admin as any).from('user_flashcard_progress')
      .select('ease_factor,interval_days,repetitions,review_count,correct_count')
      .eq('user_id', user.id).eq('flashcard_id', flashcardId).maybeSingle();
    if (existingError) {
      console.error('[Flashcard Progress] Existing progress lookup failed:', existingError);
      return NextResponse.json({ success: false, error: 'Unable to update your flashcard progress.' }, { status: 500 });
    }

    const previousEase = Number(existing?.ease_factor) || 2.5;
    const previousInterval = Number(existing?.interval_days) || 0;
    const previousRepetitions = Number(existing?.repetitions) || 0;
    const easeFactor = Math.max(1.3, Math.min(3.0, previousEase + (rating === 'again' ? -0.2 : rating === 'easy' ? 0.15 : 0)));
    const repetitions = rating === 'again' ? 0 : previousRepetitions + 1;
    const intervalDays = rating === 'again' ? 1 : rating === 'easy'
      ? (previousRepetitions === 0 ? 4 : previousRepetitions === 1 ? 7 : Math.max(1, Math.round(previousInterval * (easeFactor + 0.3))))
      : (previousRepetitions === 0 ? 1 : previousRepetitions === 1 ? 3 : Math.max(1, Math.round(previousInterval * easeFactor)));
    const reviewedAt = new Date();
    const dueAt = new Date(reviewedAt.getTime() + intervalDays * 86400000);
    const reviewCount = (Number(existing?.review_count) || 0) + 1;
    const correctCount = (Number(existing?.correct_count) || 0) + (rating === 'again' ? 0 : 1);

    const { error: saveError } = await (admin as any).from('user_flashcard_progress').upsert({
      user_id: user.id,
      flashcard_id: card.id,
      deck_id: card.deck_id,
      exam_id: card.exam_id,
      subject_id: card.subject_id,
      topic_id: card.topic_id,
      subtopic_id: card.subtopic_id,
      mastery_status: rating === 'easy' ? 'mastered' : 'review',
      ease_factor: easeFactor,
      interval_days: intervalDays,
      repetitions,
      review_count: reviewCount,
      correct_count: correctCount,
      last_rating: rating,
      last_reviewed_at: reviewedAt.toISOString(),
      due_at: dueAt.toISOString(),
      updated_at: reviewedAt.toISOString(),
    }, { onConflict: 'user_id,flashcard_id' });

    if (saveError) {
      console.error('[Flashcard Progress] Save failed:', saveError);
      return NextResponse.json({ success: false, error: 'Unable to save your flashcard progress.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, progress: {
      flashcard_id: card.id, mastery_status: rating === 'easy' ? 'mastered' : 'review',
      last_rating: rating, interval_days: intervalDays, repetitions, review_count: reviewCount,
      correct_count: correctCount, due_at: dueAt.toISOString(), last_reviewed_at: reviewedAt.toISOString(),
    } });
  } catch (error) {
    console.error('[Flashcard Progress] POST failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to save your flashcard progress.' }, { status: 500 });
  }
}
