import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Layers,
  StickyNote,
  GraduationCap,
  ShieldCheck,
  BrainCircuit,
  ChevronRight,
} from 'lucide-react';
import { getPublicTopicBySlug, getPublicTopicMcqs } from '@/lib/seo/db-queries';
import { generateTopicMetadata } from '@/lib/seo/metadata';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { RelatedContent } from '@/components/seo/related-content';

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string; topicSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug, topicSlug } = await params;
  const result = await getPublicTopicBySlug(examSlug, subjectSlug, topicSlug);
  if (!result) return { title: 'Topic Not Found | NeoMCQ' };
  return generateTopicMetadata(result.topic, result.subject, result.exam);
}

export default async function PublicTopicPage({ params }: PageProps) {
  const { examSlug, subjectSlug, topicSlug } = await params;
  const result = await getPublicTopicBySlug(examSlug, subjectSlug, topicSlug);

  if (!result) {
    notFound();
  }

  const { exam, subject, topic } = result;
  const { mcqs: sampleMcqs, total: mcqsTotal } = await getPublicTopicMcqs({
    topicId: topic.id,
    examId: exam.id,
    limit: 6,
    isAuthenticated: false,
  });

  const breadcrumbs = [
    { name: exam.name, url: `/${exam.slug}` },
    { name: subject.name, url: `/${exam.slug}/${subject.slug}` },
    { name: topic.name, url: `/${exam.slug}/${subject.slug}/${topic.slug}` },
  ];

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Banner */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0D1326] via-[#0F172A] to-[#131B38] border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {subject.name}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300">
              {exam.name}
            </span>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {topic.name} MCQs & Study Guide
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              {topic.description ||
                `Master high-yield concepts, clinical vignettes, and diagnostic pearls for ${topic.name} under ${subject.name}.`}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq`}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all inline-flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Practice All {topic.name} MCQs ({mcqsTotal})</span>
            </Link>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured MCQs from this topic */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  High-Yield Practice Questions
                </h2>
                <Link
                  href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq`}
                  className="text-xs text-indigo-400 hover:underline font-semibold"
                >
                  View All Questions →
                </Link>
              </div>

              <div className="space-y-3">
                {sampleMcqs.map((m, idx) => (
                  <Link
                    key={m.id}
                    href={`/${exam.slug}/${subject.slug}/${topic.slug}/mcq/${m.slug}`}
                    className="p-5 rounded-2xl bg-[#0D1326] border border-slate-800 hover:border-indigo-500/40 transition-all block space-y-3 group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-indigo-400">Question #{idx + 1}</span>
                      <span className="capitalize">{m.difficulty}</span>
                    </div>

                    <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors leading-relaxed">
                      {m.question}
                    </p>

                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 pt-1">
                      <span>Solve Interactive MCQ</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Learning Objectives / Core Concepts */}
            <section className="p-6 sm:p-8 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Key Diagnostic & Board Concepts
              </h2>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span>
                    <strong>First-line Diagnostic Criteria:</strong> Always correlate clinical presentation with specific pathognomonic biomarkers before initiating therapy.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span>
                    <strong>Common Board Traps:</strong> Be mindful of distractor options describing contraindicated monotherapies or outdated empirical protocols.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span>
                    <strong>Multi-tier Rationale:</strong> Review each distractor to master the differential diagnosis and mechanisms of action.
                  </span>
                </li>
              </ul>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <RelatedContent exam={exam} subject={subject} topic={topic} relatedMcqs={sampleMcqs} />
          </div>
        </div>
      </div>
    </main>
  );
}
