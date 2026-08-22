import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem } from '@/lib/seo/types';
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  id?: string;
  className?: string;
}

export function Breadcrumbs({ items, id = 'seo-breadcrumbs', className = '' }: BreadcrumbsProps) {
  const jsonLd = generateBreadcrumbSchema(items);

  return (
    <nav id={id} aria-label="Breadcrumb" className={`w-full ${className}`}>
      {/* Schema.org BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-indigo-400 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.url} className="inline-flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              {isLast ? (
                <span className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-[320px]">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="hover:text-indigo-400 transition-colors truncate max-w-[140px] sm:max-w-[200px]"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
