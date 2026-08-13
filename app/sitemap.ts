import { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://neomcq.com';

  // 1. Static Public Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/exams`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/auth/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth/sign-up`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 2. Dynamic Public Active Exams
    const { data: exams } = await supabaseAdmin
      .from('exams')
      .select('slug, updated_at')
      .eq('status', 'active');

    const examPages: MetadataRoute.Sitemap = (exams || []).map((exam) => ({
      url: `${baseUrl}/exams/${exam.slug}`,
      lastModified: exam.updated_at ? new Date(exam.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // 3. Dynamic Public Canonical MCQs
    const { data: mcqs } = await supabaseAdmin
      .from('mcqs')
      .select('slug, updated_at')
      .eq('status', 'approved')
      .in('visibility', ['PUBLIC_CANONICAL', 'PUBLIC_DISCOVERABLE'])
      .not('slug', 'is', null)
      .limit(1000);

    const mcqPages: MetadataRoute.Sitemap = (mcqs || []).map((mcq) => ({
      url: `${baseUrl}/mcq/${mcq.slug}`,
      lastModified: mcq.updated_at ? new Date(mcq.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticPages, ...examPages, ...mcqPages];
  } catch (err) {
    console.error('Failed to generate dynamic sitemap entries:', err);
    return staticPages;
  }
}


