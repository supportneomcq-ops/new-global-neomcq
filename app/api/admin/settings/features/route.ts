import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

const DEFAULT_FLAGS = {
  aiTutor: true,
  newOnboarding: true,
  flashcards: true,
  revisionSheets: true,
  pwa: true,
  newMcqEngine: true,
  newDashboard: true
};

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { data } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('key', 'features')
      .maybeSingle();

    const featureFlags = data?.value || DEFAULT_FLAGS;

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

    const adminClient = getSupabaseAdmin();
    const { data } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('key', 'features')
      .maybeSingle();

    const featureFlags = data?.value || DEFAULT_FLAGS;
    featureFlags[key] = enabled;

    const { error } = await adminClient
      .from('system_settings')
      .upsert(
        {
          key: 'features',
          value: featureFlags,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;

    // Audit action
    await logRevenueAuditEvent({
      admin_id: auth.user?.id,
      admin_email: auth.user?.email,
      action: 'FEATURE_FLAG_UPDATE',
      target: `flag:${key}`,
      metadata: { enabled, featureFlags },
    });

    return NextResponse.json({ success: true, featureFlags });
  } catch (err: any) {
    console.error('Admin POST feature flags error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
