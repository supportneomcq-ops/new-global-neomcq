import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ArrowLeft,
  Share2,
  Sparkles,
  Award,
} from 'lucide-react';
import { getPublicBlogBySlug, getAllPublicBlogs } from '@/lib/seo/db-queries';
import { generateBlogMetadata } from '@/lib/seo/metadata';
import { generateArticleSchema } from '@/lib/seo/structured-data';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { getSiteUrl } from '@/lib/seo/config';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getPublicBlogBySlug(slug);
  if (!blog) return { title: 'Article Not Found | NeoMCQ' };
  return generateBlogMetadata(blog);
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const blog = await getPublicBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  const allBlogs = await getAllPublicBlogs();
  const relatedBlogs = allBlogs.filter((b) => b.slug !== blog.slug).slice(0, 2);
  const siteUrl = getSiteUrl();

  const breadcrumbs = [
    { name: 'Blog', url: '/blog' },
    { name: blog.title, url: `/blog/${blog.slug}` },
  ];

  const articleSchema = generateArticleSchema({
    title: blog.title,
    description: blog.excerpt,
    url: `${siteUrl}/blog/${blog.slug}`,
    publishedAt: blog.published_at,
    updatedAt: blog.updated_at,
    authorName: blog.author_name,
    authorTitle: blog.author_title,
    coverImage: blog.cover_image,
    category: blog.category,
  });

  const formattedDate = new Date(blog.published_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="min-h-screen bg-[#070B19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Schema.org Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        <Breadcrumbs items={breadcrumbs} />

        <article className="p-8 sm:p-12 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-8">
          {/* Header Metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {blog.category}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {blog.reading_time_mins} min read
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl sm:leading-tight lg:text-4xl font-extrabold text-white tracking-tight">
              {blog.title}
            </h1>

            {/* Author & Reviewer Verification Box */}
            <div className="pt-4 pb-6 border-y border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                  {blog.author_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white">{blog.author_name}</p>
                  <p className="text-slate-400">{blog.author_title || 'Academic Contributor'}</p>
                </div>
              </div>

              {blog.reviewer_name && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    Medically Reviewed by <strong>{blog.reviewer_name}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Article Body */}
          <div className="prose prose-invert prose-indigo max-w-none text-slate-300 leading-relaxed space-y-6 text-sm sm:text-base">
            <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-4">
              {blog.excerpt}
            </p>

            <div className="whitespace-pre-line space-y-4">
              {blog.content}
            </div>
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Topics:</span>
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Promotional Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 text-white space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Put Active Recall into Practice on NeoMCQ
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Join thousands of medical students preparing for board exams with adaptive Q-Banks, AI tutoring, and spaced repetition.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg"
            >
              <Award className="w-4 h-4" />
              <span>Create Free Student Account</span>
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
