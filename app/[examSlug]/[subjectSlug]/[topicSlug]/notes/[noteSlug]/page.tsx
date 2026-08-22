import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  StickyNote,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Lock,
  GraduationCap,
} from 'lucide-react';
import { getPublicTopicBySlug } from '@/lib/seo/db-queries';
import { generateNoteMetadata } from '@/lib/seo/metadata';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { RelatedContent } from '@/components/seo/related-content';

interface PageProps {
  params: Promise<{
    examSlug: string;
    subjectSlug: string;
    topicSlug: string;
    noteSlug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug, topicSlug, noteSlug } = await params;
  const result = await getPublicTopicBySlug(examSlug, subjectSlug, topicSlug);
  if (!result) return { title: 'Note Not Found | NeoMCQ' };

  const noteTitle = noteSlug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return generateNoteMetadata(
    {
      id: noteSlug,
      title: `${noteTitle} Revision Note`,
      content: `High-yield clinical review and core diagnostic concepts for ${result.topic.name}.`,
      exam_name: result.exam.name,
      subject_name: result.subject.name,
      topic_name: result.topic.name,
    },
    examSlug,
    subjectSlug,
    topicSlug,
    true
  );
}

export default async function PublicNotePage({ params }: PageProps) {
  const { examSlug, subjectSlug, topicSlug, noteSlug } = await params;
  const result = await getPublicTopicBySlug(examSlug, subjectSlug, topicSlug);

  if (!result) {
    notFound();
  }

  const { exam, subject, topic } = result;
  const noteTitle = noteSlug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

  const breadcrumbs = [
    { name: exam.name, url: `/${exam.slug}` },
    { name: subject.name, url: `/${exam.slug}/${subject.slug}` },
    { name: topic.name, url: `/${exam.slug}/${subject.slug}/${topic.slug}` },
    { name: noteTitle, url: `/${exam.slug}/${subject.slug}/${topic.slug}/notes/${noteSlug}` },
  ];

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-8 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit">
                <StickyNote className="w-3.5 h-3.5" />
                <span>High-Yield Revision Guide</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {noteTitle} — {topic.name}
                </h1>
                <p className="text-xs text-slate-400">
                  {subject.name} · {exam.name}
                </p>
              </div>

              <div className="space-y-4 text-sm text-slate-300 leading-relaxed pt-2">
                <p>
                  This high-yield revision summary synthesizes the core clinical concepts, diagnostic dilemmas, and board-tested management pathways for <strong>{topic.name}</strong>.
                </p>

                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Essential Board Highlights
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                    <li>Differentiate primary etiology from secondary compensatory pathways.</li>
                    <li>Always evaluate pathognomonic biomarkers prior to invasive protocols.</li>
                    <li>Know the key contraindications and side effects for first-line therapies.</li>
                  </ul>
                </div>
              </div>

              {/* Login Gate for full annotated notes */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-indigo-500/30 space-y-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                    <Lock className="w-4 h-4 text-indigo-400" />
                    Access Topper Annotated PDF & Audio Revision
                  </h4>
                  <p className="text-xs text-slate-400">
                    Sign in to unlock interactive mnemonics, margin notes, and flashcard sync.
                  </p>
                </div>
                <Link
                  href={`/login?redirect=/${exam.slug}/${subject.slug}/${topic.slug}/notes/${noteSlug}`}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap transition-all shadow-md"
                >
                  Unlock Free
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <RelatedContent exam={exam} subject={subject} topic={topic} />
          </div>
        </div>
      </div>
    </main>
  );
}
