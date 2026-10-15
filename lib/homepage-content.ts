export interface HomepageBannerAsset {
  name: string;
  url: string;
  alt: string;
}

export interface HomepageContent {
  heroHeadlineTop: string;
  heroHeadlineHighlight: string;
  heroHeadlineBottom: string;
  heroDescription: string;
  heroImageUrl: string;
  heroImageAlt: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  banners: HomepageBannerAsset[];
}

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  heroHeadlineTop: 'Prepare Smarter.',
  heroHeadlineHighlight: 'Learn with AI.',
  heroHeadlineBottom: 'Ace Your Exam.',
  heroDescription: 'Practice MCQs, get detailed explanations, personalized study plans and AI guidance — all in one platform.',
  heroImageUrl: '/assets/student-welcome-banner.webp',
  heroImageAlt: 'Student in a purple hoodie studying with a laptop, books, and a plant',
  primaryCtaLabel: 'Start Free',
  secondaryCtaLabel: 'See How It Works',
  banners: [
    {
      name: 'NeoMCQ Student Illustration',
      url: '/assets/student-welcome-banner.webp',
      alt: 'Student in a purple hoodie studying with a laptop, books, and a plant',
    },
  ],
};

export function normalizeHomepageContent(value: unknown): HomepageContent {
  const input = value && typeof value === 'object' ? value as Partial<HomepageContent> : {};
  const banners = Array.isArray(input.banners)
    ? input.banners.filter((item): item is HomepageBannerAsset =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as HomepageBannerAsset).url === 'string' &&
        typeof (item as HomepageBannerAsset).name === 'string'
      )
    : DEFAULT_HOMEPAGE_CONTENT.banners;

  return {
    heroHeadlineTop: typeof input.heroHeadlineTop === 'string' ? input.heroHeadlineTop.slice(0, 120) : DEFAULT_HOMEPAGE_CONTENT.heroHeadlineTop,
    heroHeadlineHighlight: typeof input.heroHeadlineHighlight === 'string' ? input.heroHeadlineHighlight.slice(0, 120) : DEFAULT_HOMEPAGE_CONTENT.heroHeadlineHighlight,
    heroHeadlineBottom: typeof input.heroHeadlineBottom === 'string' ? input.heroHeadlineBottom.slice(0, 120) : DEFAULT_HOMEPAGE_CONTENT.heroHeadlineBottom,
    heroDescription: typeof input.heroDescription === 'string' ? input.heroDescription.slice(0, 600) : DEFAULT_HOMEPAGE_CONTENT.heroDescription,
    heroImageUrl: typeof input.heroImageUrl === 'string' && /^(\/|https:\/\/)/.test(input.heroImageUrl) ? input.heroImageUrl.slice(0, 2000) : DEFAULT_HOMEPAGE_CONTENT.heroImageUrl,
    heroImageAlt: typeof input.heroImageAlt === 'string' ? input.heroImageAlt.slice(0, 240) : DEFAULT_HOMEPAGE_CONTENT.heroImageAlt,
    primaryCtaLabel: typeof input.primaryCtaLabel === 'string' ? input.primaryCtaLabel.slice(0, 60) : DEFAULT_HOMEPAGE_CONTENT.primaryCtaLabel,
    secondaryCtaLabel: typeof input.secondaryCtaLabel === 'string' ? input.secondaryCtaLabel.slice(0, 60) : DEFAULT_HOMEPAGE_CONTENT.secondaryCtaLabel,
    banners: banners.slice(0, 30).map((item) => ({
      name: item.name.slice(0, 120),
      url: item.url.slice(0, 2000),
      alt: typeof item.alt === 'string' ? item.alt.slice(0, 240) : '',
    })),
  };
}
