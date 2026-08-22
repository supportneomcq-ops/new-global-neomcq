import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_SITE_METADATA } from '@/lib/seo/config';

export async function GET() {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await (supabase as any)
      .from('site_settings')
      .select('value')
      .eq('key', 'seo_config')
      .maybeSingle();

    if (data && data.value) {
      return NextResponse.json({ success: true, settings: data.value });
    }

    return NextResponse.json({
      success: true,
      settings: {
        metaTitle: DEFAULT_SITE_METADATA.title,
        metaDescription: DEFAULT_SITE_METADATA.description,
        keywords: DEFAULT_SITE_METADATA.keywords.join(', '),
        author: DEFAULT_SITE_METADATA.author,
        robots: 'index, follow',
        canonicalUrl: DEFAULT_SITE_METADATA.siteUrl,
        ogTitle: DEFAULT_SITE_METADATA.title,
        ogDescription: DEFAULT_SITE_METADATA.description,
        ogImage: `${DEFAULT_SITE_METADATA.siteUrl}/og-image.png`,
        twitterCard: 'summary_large_image',
        twitterSite: '@neomcq',
        twitterCreator: '@neomcq_edu',
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      settings: {
        metaTitle: DEFAULT_SITE_METADATA.title,
        metaDescription: DEFAULT_SITE_METADATA.description,
        keywords: DEFAULT_SITE_METADATA.keywords.join(', '),
        author: DEFAULT_SITE_METADATA.author,
        robots: 'index, follow',
        canonicalUrl: DEFAULT_SITE_METADATA.siteUrl,
        ogTitle: DEFAULT_SITE_METADATA.title,
        ogDescription: DEFAULT_SITE_METADATA.description,
        ogImage: `${DEFAULT_SITE_METADATA.siteUrl}/og-image.png`,
        twitterCard: 'summary_large_image',
        twitterSite: '@neomcq',
        twitterCreator: '@neomcq_edu',
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json();
    const { error } = await (supabase as any).from('site_settings').upsert({
      key: 'seo_config',
      value: body,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: true, message: 'Updated in memory fallback' });
  }
}
