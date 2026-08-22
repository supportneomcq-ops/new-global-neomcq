import { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Clock,
  User,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { getAllPublicBlogs } from '@/lib/seo/db-queries';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { getSiteUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'NeoMCQ Blog — Medical Board Exam Strategies & High-Yield Insights',
  description: 'Evidence-based study strategies, exam pattern analyses, active recall frameworks, and clinical reasoning guides for NEET PG, USMLE, and global medical licensing exams.',
  alternates: {
    canonical: 'https://neomcq.com/blog',
  },
  openGraph: {
    title: 'NeoMCQ Blog — Medical Board Exam Strategies & High-Yield Insights',
    description: 'Evidence-based study strategies, exam pattern analyses, and clinical reasoning guides.',
    url: 'https://neomcq.com/blog',
    type: 'website',
  },
};

export default async function BlogIndexPage() {
  const blogs = await getAllPublicBlogs();
  const siteUrl = getSiteUrl();

  const breadcrumbs = [
    { name: 'Blog', url: '/blog' },
  ];

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Banner */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0D1326] via-[#0F172A] to-[#131B38] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Insights & Medical Education</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            NeoMCQ Medical Education Blog
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
            Data-backed examination blueprints, cognitive science strategies, and high-yield subject analyses from board-certified medical educators.
          </p>
        </div>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <article
              key={blog.id}
              className="p-6 rounded-3xl bg-[#0D1326] border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold">
                    {blog.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {blog.reading_time_mins} min read
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                  <Link href={`/blog/${blog.slug}`}>
                    {blog.title}
                  </Link>
                </h2>

                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {blog.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {blog.author_name}
                </span>
                <Link
                  href={`/blog/${blog.slug}`}
                  className="font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                >
                  Read Article <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
