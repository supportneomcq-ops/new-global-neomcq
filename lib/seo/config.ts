/**
 * NeoMCQ Production SEO Configuration
 * Central single source of truth for SEO defaults, canonical URLs, and metadata.
 */

export function getSiteUrl(): string {
  // 1. Explicit production site URL env
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }
  // 2. Deployment APP_URL
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  // 3. Vercel deployment URL
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/\/+$/, '')}`;
  }
  // 4. Default fallback
  return 'https://neomcq.com';
}

export const SEO_CONFIG = {
  siteName: 'NeoMCQ',
  tagline: 'World’s Most Intelligent AI Exam Preparation Platform',
  defaultTitle: 'NeoMCQ — World’s Most Intelligent AI Exam Preparation Platform',
  titleTemplate: '%s | NeoMCQ',
  defaultDescription:
    'Prepare for medical and global licensing exams (NEET PG, USMLE Step 1, NCLEX-RN, FMGE) with high-yield practice MCQs, clinical pearls, adaptive revision notes, and AI-powered study aids.',
  defaultKeywords: [
    'NEET PG MCQs',
    'USMLE Step 1 Practice Questions',
    'NCLEX-RN Practice',
    'FMGE Exam Prep',
    'Medical MCQs with Rationale',
    'Clinical Case Questions',
    'High Yield Revision Notes',
    'Medical Flashcards',
    'Adaptive Medical Q-Bank',
    'NeoMCQ',
  ],
  defaultOgImage: '/assets/og-image.png',
  twitterHandle: '@neomcq',
  publisher: {
    '@type': 'Organization',
    name: 'NeoMCQ',
    url: 'https://neomcq.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://neomcq.com/assets/logo.png',
    },
  },
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  bingSiteVerification: process.env.BING_SITE_VERIFICATION || '',
};

export const DEFAULT_SITE_METADATA = {
  title: SEO_CONFIG.defaultTitle,
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.defaultKeywords,
  author: 'NeoMCQ Academic Medical Board',
  siteUrl: getSiteUrl(),
};
