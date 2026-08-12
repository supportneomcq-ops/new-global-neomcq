import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const admin = getSupabaseAdmin();

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const isConfigured = Boolean(keyId && keySecret);
    const environment = process.env.NODE_ENV === 'production' ? 'Production' : 'Test / Sandbox';

    // Query recent webhook events
    const { data: webhooks } = await admin
      .from('webhook_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50);

    const webhookList = webhooks || [];
    const totalWebhooks = webhookList.length;
    const successfulWebhooks = webhookList.filter((w: any) => w.status === 'processed' || w.status === 'duplicate_skipped').length;
    const webhookSuccessRate = totalWebhooks > 0 ? Number(((successfulWebhooks / totalWebhooks) * 100).toFixed(1)) : 100;
    const lastWebhook = webhookList.length > 0 ? webhookList[0].received_at : null;

    // Fetch Recent Payment Events from DB
    const { data: recentPayments } = await admin
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch Payment Errors
    const { data: failedPayments } = await admin
      .from('payments')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: failedWebhooks } = await admin
      .from('webhook_events')
      .select('*')
      .eq('status', 'failed')
      .order('received_at', { ascending: false })
      .limit(20);

    // Payment Reconciliation analysis (Database vs Expected state)
    const allPayments = recentPayments || [];
    const matchedCount = allPayments.filter((p: any) => p.status === 'captured' || p.status === 'completed').length;
    const pendingVerification = allPayments.filter((p: any) => p.status === 'pending' || p.status === 'authorized').length;
    const failedCount = allPayments.filter((p: any) => p.status === 'failed').length;

    const reconciliation = {
      totalAnalyzed: allPayments.length,
      matched: matchedCount,
      pendingVerification,
      failed: failedCount,
      missingLocallyCount: 0,
      potentialDuplicates: 0,
      discrepancies: [],
    };

    return NextResponse.json({
      success: true,
      environment,
      status: {
        connectionStatus: isConfigured ? 'Configured' : 'Not Configured',
        keyIdMasked: keyId ? `${keyId.substring(0, 8)}...` : 'Not Set',
        hasSecretKey: Boolean(keySecret),
        hasWebhookSecret: Boolean(webhookSecret),
        webhookStatus: webhookSuccessRate > 90 ? 'Healthy' : 'Degraded',
        lastWebhookAt: lastWebhook,
        webhookSuccessRate: `${webhookSuccessRate}%`,
        apiHealth: isConfigured ? 'Healthy' : 'Not Configured',
      },
      recentEvents: recentPayments || [],
      failedPayments: failedPayments || [],
      failedWebhooks: failedWebhooks || [],
      reconciliation,
    });
  } catch (error: any) {
    console.error('Razorpay status API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
