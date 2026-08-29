import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { AIGateway } from '@/lib/ai-gateway';

// GET: List configured AI providers (Gemini & OpenAI with active keys and real status)
export async function GET() {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const providers = await AIGateway.getProvidersStatus();

    return NextResponse.json({
      success: true,
      providers,
      activeProvidersCount: providers.filter((p) => p.configuredStatus === 'Configured').length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Run real live connectivity and benchmark test
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { action, providerId } = body;

    if (action === 'test_provider') {
      if (providerId !== 'gemini' && providerId !== 'openai') {
        return NextResponse.json({ error: 'Invalid provider ID. Only Gemini and OpenAI are active.' }, { status: 400 });
      }

      const result = await AIGateway.testProvider(providerId as 'gemini' | 'openai');

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
