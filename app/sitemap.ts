import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/config';
import { getAllIndexableUrls } from '@/lib/seo/db-queries';

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  // 1. Static Core Hub Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/exams`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    const { exams, subjects, topics, mcqs, blogs } = await getAllIndexableUrls();

    // 2. Exam pages
    const examEntries: MetadataRoute.Sitemap = exams.map((e) => ({
      url: `${baseUrl}${e.url}`,
      lastModified: new Date(e.lastmod),
      changeFrequency: 'weekly',
      priority: 0.85,
    }));

    // 3. Subject pages
    const subjectEntries: MetadataRoute.Sitemap = subjects.map((s) => ({
      url: `${baseUrl}${s.url}`,
      lastModified: new Date(s.lastmod),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // 4. Topic pages
    const topicEntries: MetadataRoute.Sitemap = topics.map((t) => ({
      url: `${baseUrl}${t.url}`,
      lastModified: new Date(t.lastmod),
      changeFrequency: 'weekly',
      priority: 0.75,
    }));

    // 5. Individual MCQs
    const mcqEntries: MetadataRoute.Sitemap = mcqs.map((m) => ({
      url: `${baseUrl}${m.url}`,
      lastModified: new Date(m.lastmod),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    // 6. Blog posts
    const blogEntries: MetadataRoute.Sitemap = blogs.map((b) => ({
      url: `${baseUrl}${b.url}`,
      lastModified: new Date(b.lastmod),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    return [
      ...staticPages,
      ...examEntries,
      ...subjectEntries,
      ...topicEntries,
      ...mcqEntries,
      ...blogEntries,
    ];
  } catch (err) {
    console.error('Failed to generate dynamic sitemap entries:', err);
    return staticPages;
  }
}



