import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  ChevronRight,
  Search,
} from 'lucide-react';
import { getPublicExamBySlug, getPublicExamSubjects } from '@/lib/seo/db-queries';
import { generateExamMetadata } from '@/lib/seo/metadata';
import { generateExamCourseSchema, generateBreadcrumbSchema } from '@/lib/seo/structured-data';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { getSiteUrl } from '@/lib/seo/config';

interface PageProps {
  params: Promise<{ examSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug } = await params;
  const exam = await getPublicExamBySlug(examSlug);
  if (!exam) return { title: 'Exam Not Found | NeoMCQ' };
  return generateExamMetadata(exam);
}

export default async function PublicExamPage({ params }: PageProps) {
  const { examSlug } = await params;
  const exam = await getPublicExamBySlug(examSlug);

  if (!exam) {
    notFound();
  }

  const subjects = await getPublicExamSubjects(exam.id, exam.slug);
  const siteUrl = getSiteUrl();

  const breadcrumbs = [
    { name: 'All Exams', url: '/exams' },
    { name: exam.name, url: `/${exam.slug}` },
  ];

  const courseSchema = generateExamCourseSchema({
    name: exam.name,
    description: exam.description || `Comprehensive exam preparation and question bank for ${exam.name}.`,
    url: `${siteUrl}/${exam.slug}`,
  });

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Schema.org Course JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0D1326] via-[#0F172A] to-[#131B38] border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <GraduationCap className="w-8 h-8" />
              </span>
              <div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                  {exam.difficulty} Level
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                {exam.question_count} Questions
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                {exam.time_limit_mins} Mins
              </span>
            </div>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              {exam.name} Preparation
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              {exam.description ||
                `Prepare for ${exam.name} with AI-powered spaced repetition, clinical vignette question banks, and structured high-yield revision summaries.`}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href={`/login?redirect=/${exam.slug}`}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all inline-flex items-center gap-2"
            >
              <span>Start Free Practice Test</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            {exam.official_website && (
              <a
                href={exam.official_website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-2xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <span>Official Exam Portal</span>
              </a>
            )}
          </div>
        </div>

        {/* Subjects Grid */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                {exam.name} Syllabus & Subject Breakdown
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Explore topic-wise MCQs, clinical case discussions, and high-yield notes by subject.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
              {subjects.length} Subjects
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subj) => (
              <Link
                key={subj.slug}
                href={`/${exam.slug}/${subj.slug}`}
                className="p-6 rounded-2xl bg-[#0D1326] border border-slate-800 hover:border-indigo-500/40 transition-all hover:-translate-y-0.5 space-y-3 group block"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">
                    {subj.name.slice(0, 2).toUpperCase()}
                  </span>
                  {subj.weight_percentage && (
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800">
                      ~{subj.weight_percentage}% Weight
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {subj.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {subj.description || `Comprehensive board questions and revision topics for ${subj.name}.`}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <span>Explore MCQs & Topics</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Preparation Highlights & Trust */}
        <section className="p-8 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Why Prepare for {exam.name} with NeoMCQ?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-sm font-bold text-white">Clinical Vignette Focus</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-step patient scenarios mirroring modern board examination blueprints.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-sm font-bold text-white">Spaced Repetition Algorithm</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated memory retention scheduling to lock in high-yield medical facts permanently.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-sm font-bold text-white">Distractor Breakdown</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Detailed rationale explaining exactly why every distractor is incorrect in context.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
