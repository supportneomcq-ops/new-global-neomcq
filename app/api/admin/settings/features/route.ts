import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

let featureFlags: Record<string, boolean> = {
  aiTutor: true,
  newMcqEngine: true,
  flashcards: true,
  revisionSheets: true,
  pwa: true,
  newOnboarding: true,
  paymentFeatures: true,
};

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    return NextResponse.json({ success: true, featureFlags });
  } catch (err: any) {
    console.error('Admin GET feature flags error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const { key, enabled } = await req.json();
    if (key in featureFlags) {
      featureFlags[key] = enabled;
    }

    // Audit action
    const supabase = getSupabaseAdmin();
    await supabase.from('revenue_audit_logs').insert({
      admin_id: auth.user?.id || null,
      admin_email: auth.user?.email || 'system',
      action: 'FEATURE_FLAG_UPDATE',
      target: `flag:${key}`,
      metadata: { enabled },
    });

    return NextResponse.json({ success: true, featureFlags });
  } catch (err: any) {
    console.error('Admin POST feature flags error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
