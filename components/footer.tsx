'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from './logo';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import {
  ArrowRight, ArrowUpRight, BookOpen, ShieldCheck, Lock, Mail,
  HelpCircle, FileText, Scale, RefreshCw, Truck, Cookie, Ban,
  Accessibility, Sparkles, GraduationCap, LifeBuoy, Compass
} from 'lucide-react';

const linkClass = 'group inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-sm';
const iconClass = 'h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-cyan-300';

export function Footer() {
  return (
    <footer
      id="site-footer"
      className="relative isolate w-full overflow-hidden border-t border-violet-400/30 bg-[#10152f] text-slate-200 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-violet-500 before:via-blue-500 before:to-cyan-400"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-36 left-[12%] h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute -top-40 right-[8%] h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-6 pt-12 sm:px-8 sm:pt-14 lg:px-10">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-10">
          {/* Brand */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-4">
            <Link href="/" aria-label="NeoMCQ home" className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
              <Logo size="sm" />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-400">
              AI-powered exam preparation with practice questions, structured notes, flashcards, study tools, and personalized learning support.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-violet-300/20 bg-gradient-to-r from-violet-400/10 to-cyan-400/10 px-3 py-2 text-xs font-medium text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Secure learning
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-violet-300/20 bg-gradient-to-r from-violet-400/10 to-cyan-400/10 px-3 py-2 text-xs font-medium text-slate-200">
                <Lock className="h-4 w-4 text-cyan-300" />
                Secure payments
              </span>
            </div>
          </div>

          {/* Product */}
          <nav aria-label="Product links" className="space-y-4 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white">
              <BookOpen className="h-4 w-4 text-violet-400" /> Product
            </h2>
            <ul className="space-y-3">
              <li><Link href="/#features" className={linkClass}><Compass className={iconClass} />Features</Link></li>
              <li><Link href="/#exams" className={linkClass}><GraduationCap className={iconClass} />Exams</Link></li>
              <li><Link href="/pricing" className={linkClass}><Sparkles className={iconClass} />Pricing</Link></li>
              <li><Link href="/#why-neomcq" className={linkClass}><ArrowUpRight className={iconClass} />Why NeoMCQ</Link></li>
              <li><Link href="/#how-it-works" className={linkClass}><ArrowRight className={iconClass} />How It Works</Link></li>
            </ul>
          </nav>

          {/* Support */}
          <nav aria-label="Support links" className="space-y-4 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white">
              <LifeBuoy className="h-4 w-4 text-cyan-300" /> Support
            </h2>
            <ul className="space-y-3">
              <li><Link href="/contact-us" className={linkClass}><Mail className={iconClass} />Contact Us</Link></li>
              <li><Link href="/pricing" className={linkClass}><Sparkles className={iconClass} />Subscriptions</Link></li>
              <li><a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className={linkClass}><HelpCircle className={iconClass} />Email Support</a></li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal links" className="space-y-4 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white">
              <Scale className="h-4 w-4 text-violet-400" /> Legal
            </h2>
            <ul className="space-y-3">
              <li><Link href="/privacy-policy" className={linkClass}><FileText className={iconClass} />Privacy Policy</Link></li>
              <li><Link href="/terms-and-conditions" className={linkClass}><Scale className={iconClass} />Terms &amp; Conditions</Link></li>
              <li><Link href="/refund-and-cancellation-policy" className={linkClass}><RefreshCw className={iconClass} />Refund Policy</Link></li>
              <li><Link href="/shipping-and-delivery-policy" className={linkClass}><Truck className={iconClass} />Digital Delivery</Link></li>
              <li><Link href="/cookie-policy" className={linkClass}><Cookie className={iconClass} />Cookie Policy</Link></li>
              <li><Link href="/acceptable-use-policy" className={linkClass}><Ban className={iconClass} />Acceptable Use</Link></li>
              <li><Link href="/accessibility" className={linkClass}><Accessibility className={iconClass} />Accessibility</Link></li>
              <li><Link href="/disclaimer" className={linkClass}><ShieldCheck className={iconClass} />Disclaimer</Link></li>
            </ul>
          </nav>

          {/* Updates */}
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">Stay in the loop</h2>
            <p className="text-sm leading-6 text-slate-400">
              Have a question or want to hear about NeoMCQ updates? Get in touch with our team.
            </p>
            <Link
              href="/contact-us"
              className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-violet-300/30 bg-gradient-to-r from-violet-500/20 via-blue-500/15 to-cyan-500/15 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-950/20 transition hover:border-cyan-300/60 hover:from-violet-500/30 hover:to-cyan-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Contact the team
              <ArrowRight className="h-4 w-4 text-violet-300" />
            </Link>
            <a
              href={`mailto:${LEGAL_CONFIG.supportEmail}`}
              className="inline-flex items-center gap-2 break-all text-xs text-slate-300 underline decoration-violet-300/50 underline-offset-4 transition hover:text-cyan-200"
            >
              {LEGAL_CONFIG.supportEmail}
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-4 text-xs text-slate-400 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl space-y-2 leading-5">
              <p className="font-medium text-slate-400">© {new Date().getFullYear()} {LEGAL_CONFIG.brandName}. All rights reserved.</p>
              <p>
                NeoMCQ is an independent educational technology platform. Examination names (USMLE, PLAB, NCLEX, NEET-PG, etc.) are trademarks of their respective owners. NeoMCQ is not affiliated with or endorsed by those examination bodies.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:justify-end md:text-right">
              <span>Effective: {LEGAL_CONFIG.effectiveDate}</span>
              <span aria-hidden="true" className="text-violet-400">•</span>
              <span>Updated: {LEGAL_CONFIG.lastUpdated}</span>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 border-t border-violet-300/15 pt-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Made for focused learning and better preparation.</span>
            <Link href="/" className="inline-flex items-center gap-1 transition hover:text-cyan-200">
              NeoMCQ <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
