import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_ITEM_TYPES = new Set([
  'a4_note',
  'flashcard',
  'mcq',
  'quiz',
  'sticky_note',
  'revision_sheet',
  'study_plan',
]);

async function getAuthenticatedUser() {
  const authClient = await createClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in required.' }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    const itemType = params.get('item_type');
    const itemId = params.get('item_id');
    const requestedLimit = Number(params.get('limit') || 100);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 100;
    const admin = getSupabaseAdmin();
    let query = admin
      .from('bookmarks')
      .select('id, item_type, item_id, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (itemType && ALLOWED_ITEM_TYPES.has(itemType)) query = query.eq('item_type', itemType);
    if (itemId) query = query.eq('item_id', itemId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, bookmarks: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to load user bookmarks:', error);
    return NextResponse.json({ success: false, error: 'Saved items could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in required.' }, { status: 401 });

  try {
    const body = await request.json();
    const itemType = String(body.item_type || body.itemType || '');
    const itemId = String(body.item_id || body.itemId || '').trim();
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null;
    if (!ALLOWED_ITEM_TYPES.has(itemType)) {
      return NextResponse.json({ success: false, error: 'Unsupported bookmark type.' }, { status: 400 });
    }
    if (!itemId || itemId.length > 200) {
      return NextResponse.json({ success: false, error: 'A valid item identifier is required.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await admin
      .from('bookmarks')
      .select('id, item_type, item_id, notes, created_at')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return NextResponse.json({ success: true, bookmark: existing, alreadySaved: true });

    const { data, error } = await admin
      .from('bookmarks')
      .insert({ user_id: user.id, item_type: itemType, item_id: itemId, notes })
      .select('id, item_type, item_id, notes, created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, bookmark: data, alreadySaved: false }, { status: 201 });
  } catch (error) {
    console.error('Failed to save user bookmark:', error);
    return NextResponse.json({ success: false, error: 'This item could not be saved.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in required.' }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    let body: any = {};
    try { body = await request.json(); } catch { /* query parameters are also supported */ }
    const id = String(body.id || params.get('id') || '').trim();
    const itemType = String(body.item_type || body.itemType || params.get('item_type') || '');
    const itemId = String(body.item_id || body.itemId || params.get('item_id') || '').trim();
    if (!id && (!ALLOWED_ITEM_TYPES.has(itemType) || !itemId)) {
      return NextResponse.json({ success: false, error: 'A bookmark ID or item type and ID are required.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    let query = admin.from('bookmarks').delete().eq('user_id', user.id);
    if (id) query = query.eq('id', id);
    else query = query.eq('item_type', itemType).eq('item_id', itemId);
    const { data, error } = await query.select('id');
    if (error) throw error;
    return NextResponse.json({ success: true, deleted: data?.length || 0 });
  } catch (error) {
    console.error('Failed to remove user bookmark:', error);
    return NextResponse.json({ success: false, error: 'This saved item could not be removed.' }, { status: 500 });
  }
}
