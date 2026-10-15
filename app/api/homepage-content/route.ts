import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_HOMEPAGE_CONTENT, normalizeHomepageContent } from '@/lib/homepage-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'homepage_content')
      .maybeSingle();

    if (error) throw error;
    const content = data?.value ? normalizeHomepageContent(data.value) : DEFAULT_HOMEPAGE_CONTENT;
    return NextResponse.json({ success: true, content }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Unable to read published homepage settings; using safe defaults.', error);
    return NextResponse.json({ success: true, content: DEFAULT_HOMEPAGE_CONTENT }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
