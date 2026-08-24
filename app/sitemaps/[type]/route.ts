import { NextRequest, NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/seo/config';
import { getAllIndexableUrls } from '@/lib/seo/db-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const ITEMS_PER_MCQ_SITEMAP = 5000;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return new Date().toISOString();
    }
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const { type } = await context.params;
  const baseUrl = getSiteUrl();
  const normalizedType = type.replace(/\.xml$/, '').toLowerCase();

  try {
    const { exams, subjects, topics, mcqs, notes, blogs } = await getAllIndexableUrls();

    let items: Array<{ url: string; lastmod: string; changefreq: string; priority: number }> = [];

    // Handle index XML request
    if (normalizedType === 'index') {
      const mcqPages = Math.max(1, Math.ceil(mcqs.length / ITEMS_PER_MCQ_SITEMAP));
      const sitemaps = [
        `${baseUrl}/sitemaps/exams.xml`,
        `${baseUrl}/sitemaps/subjects.xml`,
        `${baseUrl}/sitemaps/topics.xml`,
        ...Array.from({ length: mcqPages }, (_, i) => `${baseUrl}/sitemaps/mcqs${i === 0 ? '' : `-${i + 1}`}.xml`),
        `${baseUrl}/sitemaps/notes.xml`,
        `${baseUrl}/sitemaps/blogs.xml`,
      ];

      const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`;

      return new NextResponse(sitemapIndexXml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    if (normalizedType === 'exams') {
      items = exams.map((e) => ({
        url: `${baseUrl}${e.url}`,
        lastmod: formatDate(e.lastmod),
        changefreq: 'weekly',
        priority: 0.85,
      }));
    } else if (normalizedType === 'subjects') {
      items = subjects.map((s) => ({
        url: `${baseUrl}${s.url}`,
        lastmod: formatDate(s.lastmod),
        changefreq: 'weekly',
        priority: 0.8,
      }));
    } else if (normalizedType === 'topics') {
      items = topics.map((t) => ({
        url: `${baseUrl}${t.url}`,
        lastmod: formatDate(t.lastmod),
        changefreq: 'weekly',
        priority: 0.75,
      }));
    } else if (normalizedType.startsWith('mcqs') || normalizedType === 'mcq') {
      // Support mcqs.xml, mcqs-1.xml, mcqs-2.xml etc.
      const match = normalizedType.match(/^mcqs?-?(\d+)?$/);
      const pageNumber = match && match[1] ? Math.max(1, parseInt(match[1], 10)) : 1;
      const startIdx = (pageNumber - 1) * ITEMS_PER_MCQ_SITEMAP;
      const endIdx = startIdx + ITEMS_PER_MCQ_SITEMAP;
      const pagedMcqs = mcqs.slice(startIdx, endIdx);

      items = pagedMcqs.map((m) => ({
        url: `${baseUrl}${m.url}`,
        lastmod: formatDate(m.lastmod),
        changefreq: 'weekly',
        priority: 0.7,
      }));
    } else if (normalizedType === 'notes' || normalizedType === 'note') {
      items = (notes || []).map((n) => ({
        url: `${baseUrl}${n.url}`,
        lastmod: formatDate(n.lastmod),
        changefreq: 'monthly',
        priority: 0.6,
      }));
    } else if (normalizedType === 'blogs' || normalizedType === 'blog') {
      items = blogs.map((b) => ({
        url: `${baseUrl}${b.url}`,
        lastmod: formatDate(b.lastmod),
        changefreq: 'monthly',
        priority: 0.7,
      }));
    } else {
      return new NextResponse('Sitemap Not Found', { status: 404 });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    return new NextResponse(`<error>${escapeXml(err.message)}</error>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
