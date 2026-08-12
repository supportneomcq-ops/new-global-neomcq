import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const adminClient = getSupabaseAdmin();
    const { data } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('key', 'general')
      .maybeSingle();

    const settings = data?.value || {
      platformName: 'NeoMCQ',
      platformDescription: 'AI-Powered High-Yield MCQ Sprints, Comprehensive Study Guides, and Adaptive Learning System.',
      supportEmail: 'support@neomcq.com',
      defaultLanguage: 'English',
      defaultCountry: 'United States',
      defaultCurrency: 'USD',
      defaultTimezone: 'UTC',
      termsUrl: 'https://neomcq.com/terms',
      privacyUrl: 'https://neomcq.com/privacy',
      supportUrl: 'https://neomcq.com/support',
      registrationEnabled: true,
      maintenanceMode: false,
      maintenanceMessage: 'NeoMCQ is currently undergoing scheduled maintenance. We will be back online shortly!'
    };

    return NextResponse.json({ success: true, settings });
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

    const adminClient = getSupabaseAdmin();
    const { error } = await adminClient
      .from('system_settings')
      .upsert(
        {
          key: 'general',
          value: newSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;

    // Audit action
    await logRevenueAuditEvent({
      admin_id: auth.user?.id,
      admin_email: auth.user?.email,
      action: 'SYSTEM_SETTINGS_UPDATE',
      target: 'system_settings:general',
      metadata: newSettings,
    });

    return NextResponse.json({ success: true, settings: newSettings });
  } catch (err: any) {
    console.error('Admin POST system settings error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
