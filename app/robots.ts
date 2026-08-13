import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/exams',
          '/exams/*',
          '/mcq',
          '/mcq/*',
          '/support',
          '/terms',
          '/privacy',
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
          '/auth/private',
          '/private/*',
        ],
      },
    ],
    sitemap: 'https://neomcq.com/sitemap.xml',
  };
}


