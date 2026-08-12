import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/dashboard',
          '/dashboard/*',
          '/profile',
          '/settings',
          '/mcq',
          '/mcq/*',
          '/notes',
          '/flashcards',
          '/revision',
          '/ai-tutor',
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

