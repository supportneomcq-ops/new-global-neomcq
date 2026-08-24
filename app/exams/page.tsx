import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { BookOpen, ChevronRight, GraduationCap, Globe } from 'lucide-react';
import { getAllPublicExams } from '@/lib/seo/db-queries';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';

export const metadata: Metadata = {
  title: 'Global Medical & Licensure Exam Directory — NeoMCQ',
  description: 'Explore AI-curated practice questions and syllabi for medical, USMLE, NEET PG, PLAB, and professional board exams worldwide.',
  alternates: {
    canonical: 'https://neomcq.com/exams',
  },
  openGraph: {
    title: 'Global Medical & Licensure Exam Directory — NeoMCQ',
    description: 'AI-powered practice questions and comprehensive syllabi for global professional exams.',
    url: 'https://neomcq.com/exams',
  },
};

export const revalidate = 3600; // Revalidate every hour

export default async function ExamsDirectoryPage() {
  const exams = await getAllPublicExams();

  const breadcrumbs = [
    { name: 'All Exams', url: '/exams' },
  ];

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <Breadcrumbs items={breadcrumbs} />

        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            Global Educational Directory
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            One AI. Every Exam. Every Country.
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            Master high-yield concepts across medical, nursing, legal, engineering, and financial licensure exams with AI-verified practice content.
          </p>
        </div>

        {/* Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(exams || []).map((exam: any) => (
            <Link
              key={exam.id}
              href={`/${exam.slug}`}
              className="group bg-[#0D1326] border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                    {exam.difficulty}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                  {exam.name}
                </h2>
                <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                  {exam.description || 'Comprehensive exam preparation with high-yield questions, detailed explanations, and clinical pearls.'}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  {exam.question_count || 100}+ Questions
                </span>
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                  Explore Exam
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
