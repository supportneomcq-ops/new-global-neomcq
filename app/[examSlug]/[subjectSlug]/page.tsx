import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  FolderTree,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { getPublicSubjectBySlug, getPublicTopicMcqs } from '@/lib/seo/db-queries';
import { generateSubjectMetadata } from '@/lib/seo/metadata';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { RelatedContent } from '@/components/seo/related-content';

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const result = await getPublicSubjectBySlug(examSlug, subjectSlug);
  if (!result) return { title: 'Subject Not Found | NeoMCQ' };
  return generateSubjectMetadata(result.subject, result.exam);
}

export default async function PublicSubjectPage({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const result = await getPublicSubjectBySlug(examSlug, subjectSlug);

  if (!result) {
    notFound();
  }

  const { exam, subject, topics } = result;

  const breadcrumbs = [
    { name: exam.name, url: `/${exam.slug}` },
    { name: subject.name, url: `/${exam.slug}/${subject.slug}` },
  ];

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0D1326] via-[#0F172A] to-[#131B38] border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{exam.name} Syllabus</span>
            </div>
            {subject.weight_percentage && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                ~{subject.weight_percentage}% Examination Weight
              </span>
            )}
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {subject.name} for {exam.name}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              {subject.description ||
                `Master ${subject.name} with curated clinical question banks, diagnostic algorithms, and topic-wise revision summaries for ${exam.name}.`}
            </p>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Topics Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-400" />
                {subject.name} Topics & Modules
              </h2>
              <span className="text-xs text-slate-400">{topics.length} Topics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topics.map((top) => (
                <Link
                  key={top.slug}
                  href={`/${exam.slug}/${subject.slug}/${top.slug}`}
                  className="p-5 rounded-2xl bg-[#0D1326] border border-slate-800 hover:border-indigo-500/40 transition-all hover:-translate-y-0.5 space-y-3 group block"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {top.level || 'High Yield'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {top.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {top.description || `High-yield questions and clinical pearls for ${top.name}.`}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs font-semibold text-indigo-400">
                    <span>Practice Topic</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <RelatedContent exam={exam} subject={subject} />
          </div>
        </div>
      </div>
    </main>
  );
}
