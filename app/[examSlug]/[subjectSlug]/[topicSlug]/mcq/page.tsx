import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Filter,
} from 'lucide-react';
import { getPublicTopicBySlug, getPublicTopicMcqs } from '@/lib/seo/db-queries';
import { generateTopicMcqListingMetadata } from '@/lib/seo/metadata';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { RelatedContent } from '@/components/seo/related-content';

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string; topicSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug, topicSlug } = await params;
  const { page } = await searchParams;
  const pageNum = parseInt(page || '1', 10);
  const result = await getPublicTopicBySlug(examSlug, subjectSlug, topicSlug);
  if (!result) return { title: 'Topic MCQs Not Found | NeoMCQ' };
  return generateTopicMcqListingMetadata(result.topic, result.subject, result.exam, pageNum);
}

export default async function TopicMcqListingPage({ params, searchParams }: PageProps) {
  const { examSlug, subjectSlug, topicSlug } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const limit = 10;

  const result = await getPublicTopicBySlug(examSlug, subjectSlug, topicSlug);
  if (!result) {
    notFound();
  }

  const { exam, subject, topic } = result;
  const { mcqs, total, totalPages } = await getPublicTopicMcqs({
    topicId: topic.id,
    examId: exam.id,
    page: currentPage,
    limit,
    isAuthenticated: false,
  });

  const isMedical = Boolean(
    (exam.name || exam.category || subject.name || topic.name || '').toLowerCase().match(/medical|medicine|usmle|neet|fmge|plab|nclex|nurs|clinic|doctor/)
  );

  const breadcrumbs = [
    { name: exam.name, url: `/${exam.slug}` },
    { name: subject.name, url: `/${exam.slug}/${subject.slug}` },
    { name: topic.name, url: `/${exam.slug}/${subject.slug}/${topic.slug}` },
    { name: 'MCQs', url: `/${exam.slug}/${subject.slug}/${topic.slug}/mcq` },
  ];

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Header Header */}
        <div className="p-8 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {subject.name} · {exam.name}
            </span>
            <span className="text-xs font-medium text-slate-400">
              Showing {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} of {total} Questions
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {topic.name} Multiple Choice Questions
          </h1>
          <p className="text-sm text-slate-300">
            {isMedical
              ? 'Practice high-yield clinical MCQs and board revision scenarios with instant interactive option testing.'
              : 'Practice high-yield examination MCQs and syllabus-aligned scenarios with instant interactive testing.'}
          </p>
        </div>

        {/* Main List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {mcqs.map((m, idx) => (
              <Link
                key={m.id}
                href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq/${m.slug}`}
                className="p-6 rounded-2xl bg-[#0D1326] border border-slate-800 hover:border-indigo-500/40 transition-all block space-y-3 group"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-indigo-400">
                    Question #{(currentPage - 1) * limit + idx + 1}
                  </span>
                  <span className="capitalize">{m.difficulty}</span>
                </div>

                <h2 className="text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors leading-relaxed">
                  {m.question}
                </h2>

                <div className="pt-2 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <span>Solve Question & View Options</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                {currentPage > 1 ? (
                  <Link
                    href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq?page=${currentPage - 1}`}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous
                  </Link>
                ) : (
                  <div />
                )}

                <span className="text-xs text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <Link
                    href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq?page=${currentPage + 1}`}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <RelatedContent exam={exam} subject={subject} topic={topic} />
          </div>
        </div>
      </div>
    </main>
  );
}
