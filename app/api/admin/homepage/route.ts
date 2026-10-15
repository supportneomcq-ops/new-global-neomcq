import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_HOMEPAGE_CONTENT, normalizeHomepageContent } from '@/lib/homepage-content';

export const dynamic = 'force-dynamic';

async function requireHomepageAdmin() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { user: null, response: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };

  const adminClient = getSupabaseAdmin();
  const { data: assignments, error } = await adminClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  if (error) {
    console.error('Homepage editor role check failed:', error);
    return { user: null, response: NextResponse.json({ error: 'Could not verify administrator access.' }, { status: 500 }) };
  }

  const roles = assignments?.map((row: any) => row.roles?.name).filter(Boolean) || [];
  if (!roles.some((role: string) => ['admin', 'super_admin', 'content_admin'].includes(role))) {
    return { user: null, response: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) };
  }
  return { user, response: null };
}

async function readSetting(client: ReturnType<typeof getSupabaseAdmin>, key: string) {
  const { data, error } = await client.from('system_settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

async function writeSetting(client: ReturnType<typeof getSupabaseAdmin>, key: string, value: unknown, userId: string) {
  const { error } = await client.from('system_settings').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
  if (error) throw error;
  await client.from('audit_logs').insert({
    user_id: userId,
    action: key === 'homepage_content' ? 'homepage_content_published' : 'homepage_content_draft_saved',
    entity_type: 'homepage',
    entity_id: key,
    details: { key },
  }).then(({ error: auditError }) => {
    if (auditError) console.warn('Homepage change saved but audit record could not be written:', auditError.message);
  });
}

export async function GET() {
  const auth = await requireHomepageAdmin();
  if (auth.response) return auth.response;

  try {
    const client = getSupabaseAdmin();
    const [published, draft] = await Promise.all([
      readSetting(client, 'homepage_content'),
      readSetting(client, 'homepage_content_draft'),
    ]);
    return NextResponse.json({
      success: true,
      published: normalizeHomepageContent(published || DEFAULT_HOMEPAGE_CONTENT),
      draft: normalizeHomepageContent(draft || published || DEFAULT_HOMEPAGE_CONTENT),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Unable to load homepage editor settings:', error);
    return NextResponse.json({ error: 'Could not load homepage settings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireHomepageAdmin();
  if (auth.response || !auth.user) return auth.response || NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });

  try {
    const body = await request.json();
    const content = normalizeHomepageContent(body?.content);
    const action = body?.action;
    if (action !== 'save-draft' && action !== 'publish') {
      return NextResponse.json({ error: 'Unsupported homepage action.' }, { status: 400 });
    }

    const client = getSupabaseAdmin();
    await writeSetting(client, 'homepage_content_draft', content, auth.user.id);
    if (action === 'publish') {
      await writeSetting(client, 'homepage_content', content, auth.user.id);
      revalidatePath('/');
    }

    return NextResponse.json({ success: true, action, content });
  } catch (error) {
    console.error('Homepage content save failed:', error);
    return NextResponse.json({ error: 'Could not save homepage settings. Please retry.' }, { status: 500 });
  }
}
