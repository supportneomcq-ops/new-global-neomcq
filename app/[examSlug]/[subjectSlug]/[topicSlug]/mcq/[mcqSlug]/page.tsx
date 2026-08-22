import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicMcqByHierarchicalSlugs } from '@/lib/seo/db-queries';
import { generateMcqMetadata } from '@/lib/seo/metadata';
import { generateQuizSchema } from '@/lib/seo/structured-data';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { CanonicalMcqViewer } from '@/components/seo/canonical-mcq-viewer';
import { RelatedContent } from '@/components/seo/related-content';
import { getSiteUrl } from '@/lib/seo/config';

interface PageProps {
  params: Promise<{
    examSlug: string;
    subjectSlug: string;
    topicSlug: string;
    mcqSlug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug, topicSlug, mcqSlug } = await params;
  const result = await getPublicMcqByHierarchicalSlugs({
    examSlug,
    subjectSlug,
    topicSlug,
    mcqSlug,
    isAuthenticated: false, // Crawlers are always unauthenticated
  });

  if (!result) return { title: 'Question Not Found | NeoMCQ' };
  return generateMcqMetadata(result.mcq, examSlug, subjectSlug, topicSlug, result.isIndexable);
}

export default async function IndividualMcqPage({ params }: PageProps) {
  const { examSlug, subjectSlug, topicSlug, mcqSlug } = await params;
  
  // Fetch MCQ - STRICT SECURITY: isAuthenticated = false for public server render
  const result = await getPublicMcqByHierarchicalSlugs({
    examSlug,
    subjectSlug,
    topicSlug,
    mcqSlug,
    isAuthenticated: false,
  });

  if (!result) {
    notFound();
  }

  const { exam, subject, topic, mcq, relatedMcqs } = result;
  const siteUrl = getSiteUrl();

  const breadcrumbs = [
    { name: exam.name, url: `/${exam.slug}` },
    { name: subject.name, url: `/${exam.slug}/${subject.slug}` },
    { name: topic.name, url: `/${exam.slug}/${subject.slug}/${topic.slug}` },
    { name: 'Practice MCQ', url: `/${exam.slug}/${subject.slug}/${topic.slug}/mcq/${mcq.slug}` },
  ];

  // Schema.org Quiz structured data (Without leaking answer keys!)
  const quizSchema = generateQuizSchema({
    question: mcq.question,
    options: mcq.options,
    examName: exam.name,
    subjectName: subject.name,
    topicName: topic.name,
    difficulty: mcq.difficulty,
    url: `${siteUrl}/${exam.slug}/${subject.slug}/${topic.slug}/mcq/${mcq.slug}`,
  });

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Schema.org Quiz JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(quizSchema) }}
      />

      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Question & Interactive Solver */}
          <div className="lg:col-span-2 space-y-6">
            <CanonicalMcqViewer
              mcq={mcq}
              examSlug={exam.slug}
              subjectSlug={subject.slug}
              topicSlug={topic.slug}
              isAuthenticated={false}
            />
          </div>

          {/* Sidebar & Related Taxonomy */}
          <div className="space-y-6">
            <RelatedContent
              exam={exam}
              subject={subject}
              topic={topic}
              relatedMcqs={relatedMcqs}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
