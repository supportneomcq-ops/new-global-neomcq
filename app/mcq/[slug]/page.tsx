import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PublicMcqViewer } from '@/components/public-mcq-viewer';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

import { getSiteUrl } from '@/lib/seo/config';
import { slugify } from '@/lib/seo/db-queries';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = getSiteUrl();
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin.rpc('get_public_mcq_by_slug', { p_slug: slug });

  if (!data || data.length === 0) {
    return {
      title: 'Question Not Found — NeoMCQ',
      description: 'The requested practice question was not found.',
      robots: { index: false, follow: true },
    };
  }

  const mcq = data[0];
  const truncatedQuestion = mcq.question.length > 150 ? `${mcq.question.substring(0, 147)}...` : mcq.question;
  const title = `${mcq.exam_name ? `${mcq.exam_name}: ` : ''}${truncatedQuestion} — NeoMCQ`;
  const description = `Practice high-yield ${mcq.exam_name || 'exam'} question: "${truncatedQuestion}". Learn with detailed rationale and clinical pearls.`;
  
  // Direct canonical to hierarchical structure if possible
  const examSlug = slugify(mcq.exam_name || 'neet-pg');
  const subjectSlug = slugify(mcq.subject_name || 'medicine');
  const topicSlug = slugify(mcq.topic_name || 'clinical-cases');
  const canonicalUrl = `${siteUrl}/${examSlug}/${subjectSlug}/${topicSlug}/mcq/${slug}`;

  return {
    title,
    description,
    keywords: [mcq.exam_name, mcq.subject_name, mcq.topic_name, 'MCQ', 'Practice Questions', 'Exam Prep'].filter(Boolean) as string[],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'NeoMCQ',
      locale: 'en_US',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicMcqPage({ params }: PageProps) {
  const { slug } = await params;
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc('get_public_mcq_by_slug', { p_slug: slug });

  if (error || !data || data.length === 0) {
    notFound();
  }

  const mcq = data[0];

  // Strictly ensure correct_answer and protected explanation are never present in serialized server payload
  delete mcq.correct_answer;
  delete mcq.answer_key;
  delete mcq.explanation;
  delete mcq.clinical_pearl;
  delete mcq.rationale;

  // Generate Google Structured Data (Quiz format WITHOUT hidden answer key)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: mcq.question,
    about: {
      '@type': 'EducationalOccupationalCredential',
      name: mcq.exam_name || 'Global Exam Prep',
    },
    educationalLevel: mcq.difficulty || 'Intermediate',
    hasPart: [
      {
        '@type': 'Question',
        name: mcq.question,
        suggestedAnswer: Array.isArray(mcq.options)
          ? mcq.options.map((opt: string) => ({
              '@type': 'Answer',
              text: opt,
            }))
          : [],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Global Exams
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verified Canonical Practice Content
          </div>
        </div>

        {/* MCQ Interactive Component */}
        <PublicMcqViewer mcq={mcq} />

        {/* Public Educational Footer Context */}
        <div className="mt-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">
            Preparing for {mcq.exam_name || 'Medical & Professional Exams'}?
          </h3>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            NeoMCQ provides AI-powered, adaptive question banks and real-time tutoring across 100+ global exam curricula.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Start Free AI Practice Session
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
