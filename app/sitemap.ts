import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://neomcq.com';

  // Public user-facing routes ONLY - Admin routes strictly excluded
  const publicRoutes = [
    '',
    '/auth/sign-in',
    '/auth/sign-up',
    '/auth/forgot-password',
    '/dashboard',
    '/learn',
    '/mcq',
    '/notes',
    '/flashcards',
    '/revision',
    '/ai-tutor',
    '/profile',
    '/settings',
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));
}
