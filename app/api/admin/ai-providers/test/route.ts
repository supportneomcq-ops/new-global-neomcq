import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { AIGateway } from '@/lib/ai/ai-gateway';
import { AIProviderId } from '@/lib/ai/types';

/**
 * POST /api/admin/ai-providers/test
 * Tests real provider connectivity with live probe ping. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json().catch(() => ({}));
    const { provider, probeModel } = body;

    if (!provider || (provider !== 'gemini' && provider !== 'openai')) {
      return NextResponse.json(
        { error: 'Valid provider is required ("gemini" or "openai")' },
        { status: 400 }
      );
    }

    const testResult = await AIGateway.testProvider(provider as AIProviderId, probeModel);

    return NextResponse.json({
      success: true,
      ...testResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to test provider connectivity',
      },
      { status: 500 }
    );
  }
}
