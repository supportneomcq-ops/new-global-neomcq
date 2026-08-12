import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

async function checkIsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const adminClient = getSupabaseAdmin();
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  const userEmail = user.email?.toLowerCase().trim() || '';
  const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim();
  const isAdminEmail = userEmail === initialAdminEmail || userEmail === 'swapnilsonawane913@gmail.com';

  if (!isAdminEmail && !roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

const CANONICAL_MODELS = [
  {
    id: 'gemini-3.5-flash',
    provider: 'Google Gemini AI',
    model: 'gemini-3.5-flash',
    purpose: 'Primary MCQ & Concept Generation',
    enabled: true,
    priority: 1,
    fallback: 'gpt-4o-mini',
    contextLimit: '1,000,000 tokens',
    costInput: '$0.075 / 1M',
    costOutput: '$0.30 / 1M',
    health: 'Healthy',
    lastUsed: 'Just now',
  },
  {
    id: 'gemini-3.6-flash',
    provider: 'Google Gemini AI',
    model: 'gemini-3.6-flash',
    purpose: 'High-Yield Reasoning & Clinical Scenarios',
    enabled: true,
    priority: 2,
    fallback: 'gpt-4o',
    contextLimit: '1,000,000 tokens',
    costInput: '$0.10 / 1M',
    costOutput: '$0.40 / 1M',
    health: 'Healthy',
    lastUsed: '5 mins ago',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    purpose: 'Secondary Fallback & Fast Summaries',
    enabled: true,
    priority: 3,
    fallback: 'claude-3-5-sonnet-20241022',
    contextLimit: '128,000 tokens',
    costInput: '$0.15 / 1M',
    costOutput: '$0.60 / 1M',
    health: 'Healthy',
    lastUsed: '1 hour ago',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'Anthropic',
    model: 'claude-3-5-sonnet-20241022',
    purpose: 'Deep Explanations & Medical Accuracy Review',
    enabled: true,
    priority: 4,
    fallback: 'llama-3.3-70b-versatile',
    contextLimit: '200,000 tokens',
    costInput: '$3.00 / 1M',
    costOutput: '$15.00 / 1M',
    health: 'Healthy',
    lastUsed: '3 hours ago',
  },
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'Groq',
    model: 'llama-3.3-70b-versatile',
    purpose: 'High-Speed Localized Batch Generation',
    enabled: true,
    priority: 5,
    fallback: 'deepseek-chat',
    contextLimit: '128,000 tokens',
    costInput: '$0.59 / 1M',
    costOutput: '$0.79 / 1M',
    health: 'Healthy',
    lastUsed: '2 days ago',
  },
  {
    id: 'deepseek-chat',
    provider: 'DeepSeek',
    model: 'deepseek-chat',
    purpose: 'Specialized Reasoning & Mathematical Deductions',
    enabled: true,
    priority: 6,
    fallback: 'none',
    contextLimit: '64,000 tokens',
    costInput: '$0.14 / 1M',
    costOutput: '$0.28 / 1M',
    health: 'Healthy',
    lastUsed: '1 day ago',
  },
];

// GET: Fetch configured AI models
export async function GET() {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();

    const { data: config } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('key', 'ai_models_config')
      .maybeSingle();

    if (config?.value) {
      return NextResponse.json({ success: true, models: config.value });
    }

    return NextResponse.json({ success: true, models: CANONICAL_MODELS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Save model settings
export async function POST(req: NextRequest) {
  try {
    const user = await checkIsAdmin();
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { modelsData } = body;

    const { error } = await adminClient
      .from('system_settings')
      .upsert(
        {
          key: 'ai_models_config',
          value: modelsData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'AI_MODELS_CONFIG_UPDATED',
      entity_type: 'system_settings',
      entity_id: 'ai_models_config',
      details: { updated_by: user.email },
    });

    return NextResponse.json({ success: true, message: 'AI Models routing and fallback rules saved successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
