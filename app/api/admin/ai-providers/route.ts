import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { AIGateway } from '@/lib/ai/ai-gateway';
import { ModelRegistry } from '@/lib/ai/model-registry';
import { AIProviderId } from '@/lib/ai/types';

// GET: List configured AI providers (Gemini & OpenAI with verified status & active models)
export async function GET() {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const envStatus = AIGateway.getEnvironmentStatus();
    const allModels = await ModelRegistry.getAllModels();

    const geminiModels = allModels.filter((m) => m.provider === 'gemini');
    const openaiModels = allModels.filter((m) => m.provider === 'openai');

    const providers = [
      {
        id: 'gemini',
        name: 'Google Gemini API',
        isPrimary: true,
        defaultModel: 'gemini-3.5-flash',
        supportedModels: geminiModels.map((m) => m.model_id),
        activeModelsCount: geminiModels.filter((m) => m.active).length,
        totalModelsCount: geminiModels.length,
        keysCount: envStatus.gemini.configured ? 1 : 0,
        activeKeysCount: envStatus.gemini.configured ? 1 : 0,
        health: envStatus.gemini.configured ? 'Healthy' : 'Not Configured',
        configuredStatus: envStatus.gemini.configured ? 'Configured' : 'Not Configured',
        maskedKey: envStatus.gemini.maskedKey || null,
        latencyMs: null,
        lastHealthCheck: null,
        keys: envStatus.gemini.configured
          ? [
              {
                id: 'gemini_env',
                provider: 'gemini',
                label: 'GEMINI_API_KEY (Server Env)',
                maskedKey: envStatus.gemini.maskedKey || '••••••••',
                status: 'active',
                health: 'Healthy',
              },
            ]
          : [],
      },
      {
        id: 'openai',
        name: 'OpenAI API',
        isPrimary: false,
        defaultModel: 'gpt-4o-mini',
        supportedModels: openaiModels.map((m) => m.model_id),
        activeModelsCount: openaiModels.filter((m) => m.active).length,
        totalModelsCount: openaiModels.length,
        keysCount: envStatus.openai.configured ? 1 : 0,
        activeKeysCount: envStatus.openai.configured ? 1 : 0,
        health: envStatus.openai.configured ? 'Healthy' : 'Not Configured',
        configuredStatus: envStatus.openai.configured ? 'Configured' : 'Not Configured',
        maskedKey: envStatus.openai.maskedKey || null,
        latencyMs: null,
        lastHealthCheck: null,
        keys: envStatus.openai.configured
          ? [
              {
                id: 'openai_env',
                provider: 'openai',
                label: 'OPENAI_API_KEY (Server Env)',
                maskedKey: envStatus.openai.maskedKey || '••••••••',
                status: 'active',
                health: 'Healthy',
              },
            ]
          : [],
      },
    ];

    return NextResponse.json({
      success: true,
      providers,
      activeProvidersCount: providers.filter((p) => p.configuredStatus === 'Configured').length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Run live connectivity test for provider
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { action, providerId, probeModel } = body;

    if (action === 'test_provider') {
      if (providerId !== 'gemini' && providerId !== 'openai') {
        return NextResponse.json(
          { error: 'Invalid provider ID. Only Gemini and OpenAI are active.' },
          { status: 400 }
        );
      }

      const result = await AIGateway.testProvider(providerId as AIProviderId, probeModel);

      return NextResponse.json({
        success: result.connected,
        ...result,
        message: result.connected
          ? `Successfully connected to ${result.provider.toUpperCase()} (${result.latencyMs}ms latency)`
          : `Failed to connect: ${result.errorMessage || 'Unknown error'}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
