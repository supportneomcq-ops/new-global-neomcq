'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from './logo';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { ShieldCheck, Lock, Mail, HelpCircle, FileText, Scale, RefreshCw, Truck, Cookie, Ban, Accessibility, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 dark:bg-[#030612] dark:text-slate-400 border-t border-slate-800 dark:border-slate-800/80 pt-12 pb-8 px-4 sm:px-6 lg:px-8 z-20">
      <div className="max-w-7xl mx-auto">
        {/* Top Section: Brand & Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-800">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              {LEGAL_CONFIG.platformDescription}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                256-bit SSL Encrypted
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60">
                <Lock className="w-3.5 h-3.5 text-[#00D4FF]" />
                Razorpay Secure Payments
              </span>
            </div>
          </div>

          {/* Legal & Policy Column 1 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#6D5BFF]" />
              Legal Policies
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3 h-3 text-slate-500" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Scale className="w-3 h-3 text-slate-500" />
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-and-cancellation-policy"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  Refund & Cancellation
                </Link>
              </li>
              <li>
                <Link
                  href="/disclaimer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3 h-3 text-slate-500" />
                  Educational Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policy Column 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#00D4FF]" />
              Compliance & Usage
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/shipping-and-delivery-policy"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Truck className="w-3 h-3 text-slate-500" />
                  Digital Delivery Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie-policy"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Cookie className="w-3 h-3 text-slate-500" />
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/acceptable-use-policy"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Ban className="w-3 h-3 text-slate-500" />
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/accessibility"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Accessibility className="w-3 h-3 text-slate-500" />
                  Accessibility Statement
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
              Support & Contact
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/contact-us"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-amber-400 font-semibold"
                >
                  <Mail className="w-3 h-3" />
                  Contact Support Us
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-slate-500" />
                  Pricing & Subscriptions
                </Link>
              </li>
              <li className="pt-2 text-[11px] text-slate-400">
                Support Email:<br />
                <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-slate-300 underline hover:text-white">
                  {LEGAL_CONFIG.supportEmail}
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Section: Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="space-y-1 text-center md:text-left">
            <p>© {new Date().getFullYear()} {LEGAL_CONFIG.brandName}. All rights reserved globally.</p>
            <p className="text-[11px]">
              NeoMCQ is an independent educational technology platform. Examination names (USMLE, PLAB, NCLEX, NEET-PG, etc.) are trademarks of their respective copyright holders and examination bodies. NeoMCQ is not affiliated with or endorsed by these bodies.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-[11px]">
            <span>Effective: {LEGAL_CONFIG.effectiveDate}</span>
            <span>•</span>
            <span>Updated: {LEGAL_CONFIG.lastUpdated}</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
