import { NextResponse } from 'next/server';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { AIGateway } from '@/lib/ai/ai-gateway';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Admin-only live provider smoke test. It sends a tiny prompt to each provider
 * using server-side environment keys and never returns or logs secret values.
 */
export async function GET() {
  const auth = await verifyAdminApiSession();
  if (!auth.authorized) return auth.response;

  const [gemini, openai] = await Promise.all([
    AIGateway.testProvider('gemini', 'gemini-3.5-flash-lite'),
    AIGateway.testProvider('openai', 'gpt-4o-mini'),
  ]);

  const summarize = (result: typeof gemini) => ({
    provider: result.provider,
    connected: result.connected,
    health: result.health,
    modelTested: result.modelTested || null,
    latencyMs: result.latencyMs,
    testedAt: result.testedAt,
    errorCode: result.errorCode || null,
    // Intentionally omit raw provider error details and all environment values.
  });

  const results = [summarize(gemini), summarize(openai)];
  const allConnected = results.every((result) => result.connected);

  return NextResponse.json(
    { success: allConnected, checkedAt: new Date().toISOString(), providers: results },
    { status: allConnected ? 200 : 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
