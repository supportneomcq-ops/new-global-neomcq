import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ChevronRight, GraduationCap, HelpCircle, ShieldCheck } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabaseAdmin = getSupabaseAdmin();
  const { data: exam } = await supabaseAdmin
    .from('exams')
    .select('name, description')
    .eq('slug', slug)
    .single();

  if (!exam) {
    return { title: 'Exam Not Found — NeoMCQ' };
  }

  const title = `${exam.name} Exam Preparation & High-Yield MCQs — NeoMCQ`;
  const description = exam.description || `Prepare for ${exam.name} with AI-curated practice questions, detailed rationale, and clinical pearls.`;
  const canonicalUrl = `https://neomcq.com/exams/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
  };
}

export default async function ExamDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  // Fetch exam details
  const { data: exam } = await supabaseAdmin
    .from('exams')
    .select('id, name, slug, description, difficulty, question_count, time_limit_mins')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!exam) {
    notFound();
  }

  // Fetch subjects for this exam
  const { data: subjects } = await supabaseAdmin
    .from('exam_subjects')
    .select('id, name, weight_percentage')
    .eq('exam_id', exam.id)
    .order('order_index', { ascending: true });

  // Fetch public canonical MCQs for this exam
  const { data: sampleMcqs } = await supabaseAdmin
    .from('mcqs')
    .select('id, slug, question, difficulty, explanation, created_at')
    .eq('exam_id', exam.id)
    .eq('status', 'approved')
    .in('visibility', ['PUBLIC_CANONICAL', 'PUBLIC_DISCOVERABLE'])
    .limit(10);

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Navigation Breadcrumb */}
        <Link
          href="/exams"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Global Exams
        </Link>

        {/* Hero Section */}
        <div className="bg-[#0D1326] border border-slate-800 rounded-2xl p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-6 h-6" />
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
              {exam.difficulty}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            {exam.name}
          </h1>

          <p className="text-slate-300 text-base leading-relaxed">
            {exam.description || 'Comprehensive exam syllabus coverage with high-yield practice questions and interactive explanations.'}
          </p>

          <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-6 text-sm text-slate-400">
            <div>
              <span className="block text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Questions</span>
              <span className="text-slate-200 font-bold">{exam.question_count || 100}+</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-slate-500 font-semibold">Time Limit</span>
              <span className="text-slate-200 font-bold">{exam.time_limit_mins || 120} Mins</span>
            </div>
          </div>
        </div>

        {/* Subjects & Curriculum Breakdown */}
        {subjects && subjects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Syllabus & High-Yield Subjects
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map((subj) => (
                <div
                  key={subj.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-200">{subj.name}</span>
                  {subj.weight_percentage > 0 && (
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                      {subj.weight_percentage}% Weight
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Practice Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Public Practice Questions ({sampleMcqs?.length || 0})
            </h2>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Indexable SEO Content
            </span>
          </div>

          <div className="space-y-3">
            {(sampleMcqs || []).map((mcq) => (
              <Link
                key={mcq.id}
                href={`/mcq/${mcq.slug}`}
                className="group block bg-[#0D1326] border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <p className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {mcq.question}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {mcq.explanation}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
