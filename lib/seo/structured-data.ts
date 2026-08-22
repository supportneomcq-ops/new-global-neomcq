/**
 * NeoMCQ Structured Data (JSON-LD) Generators
 * Generates valid Schema.org entities for rich snippets without leaking private answer keys.
 */

import { getSiteUrl, SEO_CONFIG } from './config';
import { BreadcrumbItem } from './types';

/**
 * Global Organization schema
 */
export function generateOrganizationSchema() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SEO_CONFIG.siteName,
    url: siteUrl,
    logo: `${siteUrl}/assets/logo.png`,
    description: SEO_CONFIG.defaultDescription,
    sameAs: ['https://twitter.com/neomcq'],
  };
}

/**
 * WebSite schema with SearchAction
 */
export function generateWebSiteSchema() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_CONFIG.siteName,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/exams?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`,
    })),
  };
}

/**
 * Quiz / Question Schema for individual MCQs
 * CRITICAL SECURITY: Never put the correct answer or explanation in the public Schema JSON-LD.
 */
export function generateQuizSchema({
  question,
  options,
  examName,
  subjectName,
  topicName,
  difficulty,
  url,
}: {
  question: string;
  options: string[];
  examName?: string;
  subjectName?: string;
  topicName?: string;
  difficulty?: string;
  url: string;
}) {
  const siteUrl = getSiteUrl();
  const canonicalUrl = url.startsWith('http') ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `${topicName || subjectName || examName || 'Medical'} Practice Question`,
    description: `High-yield practice multiple choice question for ${examName || 'licensing exam'}.`,
    educationalLevel: difficulty || 'Advanced',
    about: [
      examName ? { '@type': 'Thing', name: examName } : undefined,
      subjectName ? { '@type': 'Thing', name: subjectName } : undefined,
      topicName ? { '@type': 'Thing', name: topicName } : undefined,
    ].filter(Boolean),
    hasPart: [
      {
        '@type': 'Question',
        name: question.slice(0, 120),
        text: question,
        eduQuestionType: 'Multiple choice',
        suggestedAnswer: options.map((opt) => ({
          '@type': 'Answer',
          text: opt,
        })),
      },
    ],
    url: canonicalUrl,
    provider: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      url: siteUrl,
    },
  };
}

/**
 * Course / Exam Preparation Schema
 */
export function generateExamCourseSchema({
  name,
  description,
  url,
  providerName = 'NeoMCQ',
}: {
  name: string;
  description: string;
  url: string;
  providerName?: string;
}) {
  const siteUrl = getSiteUrl();
  const canonicalUrl = url.startsWith('http') ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${name} Exam Preparation & High-Yield Practice`,
    description,
    url: canonicalUrl,
    provider: {
      '@type': 'EducationalOrganization',
      name: providerName,
      sameAs: siteUrl,
    },
    educationalCredentialAwarded: 'Examination Readiness Certification',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'Self-paced',
    },
  };
}

/**
 * Article / BlogPosting Schema
 */
export function generateArticleSchema({
  title,
  description,
  url,
  publishedAt,
  updatedAt,
  authorName = 'NeoMCQ Editorial Board',
  authorTitle,
  coverImage,
  category,
}: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  authorName?: string;
  authorTitle?: string;
  coverImage?: string;
  category?: string;
}) {
  const siteUrl = getSiteUrl();
  const canonicalUrl = url.startsWith('http') ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    headline: title,
    description,
    image: coverImage ? (coverImage.startsWith('http') ? coverImage : `${siteUrl}${coverImage}`) : `${siteUrl}/assets/og-image.png`,
    datePublished: publishedAt,
    dateModified: updatedAt || publishedAt,
    author: {
      '@type': 'Person',
      name: authorName,
      jobTitle: authorTitle || 'Medical Faculty Member',
    },
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/assets/logo.png`,
      },
    },
    articleSection: category || 'Medical Education',
  };
}
