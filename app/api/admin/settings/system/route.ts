import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

// In-memory / server-side system settings cache (or query settings table if available)
let systemSettings = {
  maintenanceMode: false,
  registrationEnabled: true,
  contentGenerationEnabled: true,
  aiGenerationEnabled: true,
  paymentsEnabled: true,
  notificationsEnabled: true,
  defaultPagination: 25,
  systemAnnouncement: 'Welcome to NeoMCQ Pro Entrance Preparation Platform!',
};

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    return NextResponse.json({ success: true, settings: systemSettings });
  } catch (err: any) {
    console.error('Admin GET system settings error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const newSettings = await req.json();
    systemSettings = { ...systemSettings, ...newSettings };

    // Audit action
    const supabase = getSupabaseAdmin();
    await supabase.from('revenue_audit_logs').insert({
      admin_id: auth.user?.id || null,
      admin_email: auth.user?.email || 'system',
      action: 'SYSTEM_SETTINGS_UPDATE',
      target: 'system_settings',
      metadata: systemSettings,
    });

    return NextResponse.json({ success: true, settings: systemSettings });
  } catch (err: any) {
    console.error('Admin POST system settings error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
