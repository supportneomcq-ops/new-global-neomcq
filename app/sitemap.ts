import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://neomcq.com';

  // Public indexable routes ONLY - Private user pages and admin pages strictly excluded
  const publicRoutes = [
    '',
    '/auth/sign-in',
    '/auth/sign-up',
    '/auth/forgot-password',
    '/support',
    '/terms',
    '/privacy',
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.7,
  }));
}

