/**
 * Server-Side Environment Validator for AI Provider Credentials
 * Strictly server-only. Never imports client packages. Never prints raw secrets.
 */

export interface EnvValidationResult {
  gemini: {
    configured: boolean;
    maskedKey?: string;
    source: 'env' | 'none';
  };
  openai: {
    configured: boolean;
    maskedKey?: string;
    source: 'env' | 'none';
  };
  details: {
    nodeEnv: string;
    timestamp: string;
  };
}

export function maskSecret(secret?: string | null): string | undefined {
  if (!secret || secret.trim().length === 0) return undefined;
  const clean = secret.trim();
  if (clean.length <= 8) return '••••' + clean.slice(-2);
  return clean.slice(0, 4) + '••••' + clean.slice(-4);
}

export function validateServerAIEnvironment(): EnvValidationResult {
  // Read purely server-side
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const hasGemini = Boolean(geminiKey && geminiKey.trim().length > 5);
  const hasOpenAI = Boolean(openaiKey && openaiKey.trim().length > 5);

  return {
    gemini: {
      configured: hasGemini,
      maskedKey: maskSecret(geminiKey),
      source: hasGemini ? 'env' : 'none',
    },
    openai: {
      configured: hasOpenAI,
      maskedKey: maskSecret(openaiKey),
      source: hasOpenAI ? 'env' : 'none',
    },
    details: {
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  };
}
