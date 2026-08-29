import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { AIGateway } from '@/lib/ai/ai-gateway';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/admin/ai-models/verify
 * Discovers and validates candidate models against live provider APIs. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;
    const adminUser = auth.user!;

    const result = await AIGateway.verifyAndSyncAllModels();

    // Log admin audit event
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('audit_logs').insert({
        user_id: adminUser.id,
        action: 'AI_MODELS_VERIFIED',
        entity_type: 'ai_models',
        details: {
          verifiedCount: result.verifiedCount,
          unavailableCount: result.unavailableCount,
          triggeredBy: adminUser.email,
        },
      });
    } catch {
      // ignore audit log failure
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to verify AI models',
      },
      { status: 500 }
    );
  }
}
