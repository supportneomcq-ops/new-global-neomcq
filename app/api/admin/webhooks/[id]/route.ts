import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const admin = getSupabaseAdmin();

    const { data: webhook, error } = await admin
      .from('webhook_events')
      .select('*')
      .or(`id.eq.${id},event_id.eq.${id}`)
      .maybeSingle();

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 });
    }

    // Strip secrets/headers before returning payload to UI
    const safePayload = webhook.payload ? JSON.parse(JSON.stringify(webhook.payload)) : null;
    if (safePayload && safePayload.headers) {
      delete safePayload.headers.authorization;
      delete safePayload.headers['x-razorpay-signature'];
    }

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        payload: safePayload,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
