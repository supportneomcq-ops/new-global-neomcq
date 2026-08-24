import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/exams',
        '/exams/*',
        '/blog',
        '/blog/*',
        '/mcq',
        '/mcq/*',
        '/sitemap.xml',
        '/sitemaps/*',
        '/support',
        '/terms',
        '/privacy',
        '/*/*/mcq',
        '/*/*/*/mcq',
        '/*/*/*/mcq/*',
        '/*/*/*/notes/*',
        '/*/*/*/flashcards/*',
      ],
      disallow: [
        '/admin',
        '/admin/*',
        '/dashboard',
        '/dashboard/*',
        '/account',
        '/account/*',
        '/billing',
        '/billing/*',
        '/credits',
        '/credits/*',
        '/settings',
        '/settings/*',
        '/my-notes',
        '/my-mcqs',
        '/my-flashcards',
        '/my-tests',
        '/my-ai-tutor',
        '/api',
        '/api/*',
        '/auth',
        '/auth/*',
        '/login',
        '/login/*',
        '/onboarding',
        '/onboarding/*',
        '/private',
        '/private/*',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}



