/**
 * NeoMCQ Metadata Generators
 * Produces complete Next.js Metadata objects with Canonical URLs, OpenGraph, and Twitter Cards.
 */

import { Metadata } from 'next';
import { getSiteUrl, SEO_CONFIG } from './config';
import { ExamSeoData, SubjectSeoData, TopicSeoData, McqSeoData, NoteSeoData, BlogSeoData } from './types';

export function generateExamMetadata(exam: ExamSeoData): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/${exam.slug}`;
  const title = `${exam.name} Exam Preparation & High-Yield MCQs | NeoMCQ`;
  const description =
    exam.description?.slice(0, 160) ||
    `Master ${exam.name} with AI-curated practice questions, structured high-yield notes, and adaptive clinical rationale on NeoMCQ.`;

  const isIndexable = exam.verification_status !== 'rejected';

  return {
    title,
    description,
    keywords: [
      exam.name,
      `${exam.name} MCQs`,
      `${exam.name} practice test`,
      `${exam.name} high yield questions`,
      `${exam.name} syllabus`,
      ...SEO_CONFIG.defaultKeywords,
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      images: [
        {
          url: `${siteUrl}/api/og?title=${encodeURIComponent(exam.name)}&type=exam`,
          width: 1200,
          height: 630,
          alt: `${exam.name} Exam Preparation`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.twitterHandle,
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(exam.name)}&type=exam`],
    },
    robots: {
      index: isIndexable,
      follow: isIndexable,
      googleBot: {
        index: isIndexable,
        follow: isIndexable,
        'max-video-preview': isIndexable ? -1 : 0,
        'max-image-preview': isIndexable ? 'large' : 'none',
        'max-snippet': isIndexable ? -1 : 0,
      },
    },
  };
}

export function generateSubjectMetadata(subject: SubjectSeoData, exam: ExamSeoData): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/${exam.slug}/${subject.slug}`;
  const title = `${subject.name} for ${exam.name} — High-Yield MCQs & Notes | NeoMCQ`;
  const description =
    subject.description?.slice(0, 160) ||
    `Prepare for ${subject.name} in ${exam.name} with topic-wise practice questions, clinical pearls, and high-yield study notes.`;

  return {
    title,
    description,
    keywords: [
      `${subject.name} ${exam.name}`,
      `${subject.name} MCQs`,
      `${subject.name} high yield topics`,
      `${exam.name} preparation`,
      ...SEO_CONFIG.defaultKeywords,
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      images: [
        {
          url: `${siteUrl}/api/og?title=${encodeURIComponent(subject.name)}&subtitle=${encodeURIComponent(exam.name)}&type=subject`,
          width: 1200,
          height: 630,
          alt: `${subject.name} for ${exam.name}`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.twitterHandle,
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(subject.name)}&subtitle=${encodeURIComponent(exam.name)}&type=subject`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateTopicMetadata(
  topic: TopicSeoData,
  subject: SubjectSeoData,
  exam: ExamSeoData
): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/${exam.slug}/${subject.slug}/${topic.slug}`;
  const title = `${topic.name} — ${subject.name} (${exam.name}) MCQs & High-Yield Review | NeoMCQ`;
  const description =
    topic.description?.slice(0, 160) ||
    `Practice high-yield multiple choice questions and review key concepts for ${topic.name} under ${subject.name} for ${exam.name}.`;

  return {
    title,
    description,
    keywords: [
      `${topic.name} MCQs`,
      `${topic.name} ${exam.name}`,
      `${topic.name} ${subject.name}`,
      'clinical pearls',
      'medical exam revision',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      images: [
        {
          url: `${siteUrl}/api/og?title=${encodeURIComponent(topic.name)}&subtitle=${encodeURIComponent(`${subject.name} · ${exam.name}`)}&type=topic`,
          width: 1200,
          height: 630,
          alt: `${topic.name} MCQs and Notes`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.twitterHandle,
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(topic.name)}&subtitle=${encodeURIComponent(`${subject.name} · ${exam.name}`)}&type=topic`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateTopicMcqListingMetadata(
  topic: TopicSeoData,
  subject: SubjectSeoData,
  exam: ExamSeoData,
  page: number = 1
): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = page > 1
    ? `${siteUrl}/${exam.slug}/${subject.slug}/${topic.slug}/mcq?page=${page}`
    : `${siteUrl}/${exam.slug}/${subject.slug}/${topic.slug}/mcq`;

  const title = page > 1
    ? `${topic.name} Practice MCQs (Page ${page}) | ${exam.name} — NeoMCQ`
    : `${topic.name} Practice MCQs & Question Bank | ${exam.name} — NeoMCQ`;

  const description = `Solve high-yield ${topic.name} practice MCQs with clinical reasoning for ${exam.name} (${subject.name}). Page ${page}.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      type: 'website',
    },
  };
}

export function generateMcqMetadata(
  mcq: McqSeoData,
  examSlug: string,
  subjectSlug: string,
  topicSlug: string,
  isIndexable: boolean = true
): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/${examSlug}/${subjectSlug}/${topicSlug}/mcq/${mcq.slug}`;
  
  // Format clean human title
  const cleanSnippet = mcq.question.replace(/\s+/g, ' ').slice(0, 60);
  const title = `${cleanSnippet}... — ${mcq.topic_name || 'Medical'} MCQ | ${mcq.exam_name || 'NeoMCQ'}`;
  
  // High-value description without leaking answer
  const description = `Test your knowledge: "${mcq.question.slice(0, 140)}...". Practice with interactive options and explore high-yield clinical pearls for ${mcq.exam_name || 'board exams'}.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        index: isIndexable,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      type: 'article',
      images: [
        {
          url: `${siteUrl}/api/og?title=${encodeURIComponent(mcq.topic_name || 'Practice Question')}&subtitle=${encodeURIComponent(mcq.exam_name || 'Medical Exam')}&type=mcq`,
          width: 1200,
          height: 630,
          alt: `Practice MCQ: ${cleanSnippet}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.twitterHandle,
      images: [`${siteUrl}/api/og?title=${encodeURIComponent(mcq.topic_name || 'Practice Question')}&subtitle=${encodeURIComponent(mcq.exam_name || 'Medical Exam')}&type=mcq`],
    },
  };
}

export function generateNoteMetadata(
  note: NoteSeoData,
  examSlug: string,
  subjectSlug: string,
  topicSlug: string,
  isIndexable: boolean = true
): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/${examSlug}/${subjectSlug}/${topicSlug}/notes/${note.slug || note.id}`;
  const title = `${note.title} — High-Yield ${note.topic_name || 'Medical'} Notes | ${note.exam_name || 'NeoMCQ'}`;
  const description = note.summary?.slice(0, 160) || note.content.slice(0, 160);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: isIndexable,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export function generateBlogMetadata(blog: BlogSeoData): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${blog.slug}`;
  const title = `${blog.seo_title || blog.title} | NeoMCQ Blog`;
  const description = blog.seo_description || blog.excerpt || blog.content.slice(0, 160);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: blog.status === 'published' && blog.seo_indexable !== false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      type: 'article',
      publishedTime: blog.published_at,
      modifiedTime: blog.updated_at,
      authors: [blog.author_name],
      images: blog.cover_image
        ? [{ url: blog.cover_image.startsWith('http') ? blog.cover_image : `${siteUrl}${blog.cover_image}` }]
        : [{ url: `${siteUrl}/assets/og-image.png` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.twitterHandle,
    },
  };
}
