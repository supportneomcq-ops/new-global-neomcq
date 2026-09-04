import React from 'react';
import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { Cookie, ShieldCheck, Lock, Settings, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy — NeoMCQ',
  description:
    'Official Cookie Policy for NeoMCQ. Learn how essential cookies, authentication session tokens, and browser storage are used to secure and operate the platform.',
};

export default function CookiePolicyPage() {
  const toc = [
    { id: 'cookie-introduction', title: '1. What Are Cookies & Local Storage?' },
    { id: 'essential-cookies', title: '2. Strictly Necessary Essential Cookies' },
    { id: 'preference-cookies', title: '3. Preference & State Storage' },
    { id: 'analytics-security-cookies', title: '4. Security, Fraud Prevention & Performance' },
    { id: 'third-party-cookies', title: '5. Third-Party Service Provider Cookies (Razorpay & Supabase)' },
    { id: 'cookie-management', title: '6. Managing & Disabling Cookies' },
    { id: 'cookie-updates', title: '7. Policy Updates & Inquiries' },
  ];

  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="This Policy explains how NeoMCQ uses cookies, session tokens, and local storage mechanisms to authenticate accounts, save user preferences, and safeguard platform security."
      categoryName="Cookies & Tracking"
      toc={toc}
    >
      {/* 1. Intro */}
      <section id="cookie-introduction" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          1. What Are Cookies & Local Storage?
        </h2>
        <p>
          Cookies are small text files stored on your computer, tablet, or mobile browser when you visit a web platform. Local storage and session storage are modern HTML5 web technologies that allow applications to store data directly within your browser.
        </p>
        <p>
          <strong>{LEGAL_CONFIG.brandName}</strong> utilizes essential cookies and local storage items strictly to maintain user sign-in sessions, remember your active examination curriculum, store UI dark/light mode choices, and protect against automated security exploits.
        </p>
      </section>

      {/* 2. Essential Cookies */}
      <section id="essential-cookies" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          2. Strictly Necessary Essential Cookies
        </h2>
        <p>
          These cookies are mandatory for the application to function. Without them, secure authentication, billing verification, and candidate dashboards cannot be provided:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
          <li>
            <strong>Supabase Auth Tokens (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">sb-*-auth-token</code>):</strong> Cryptographically signed HTTP-only session cookies issued by Supabase Auth to keep you securely signed in as you navigate between MCQ practice drills, quizzes, and flashcards.
          </li>
          <li>
            <strong>CSRF Protection & Security Headers:</strong> Tokens used to verify that server requests originate genuinely from your browser session, preventing Cross-Site Request Forgery (CSRF) attacks.
          </li>
        </ul>
      </section>

      {/* 3. Preference Cookies */}
      <section id="preference-cookies" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Preference & State Storage
        </h2>
        <p>
          We use local storage keys to remember your personalized workspace configuration:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
          <li><strong><code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">neomcq_user_session</code>:</strong> Stores non-sensitive cached user state (active exam selection, target year) to prevent unnecessary re-fetching on page load.</li>
          <li><strong><code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">theme</code>:</strong> Remembers your preferred interface appearance (dark mode, light mode, or system default).</li>
        </ul>
      </section>

      {/* 4. Analytics & Security */}
      <section id="analytics-security-cookies" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Security, Fraud Prevention & Performance
        </h2>
        <p>
          Security cookies and edge telemetry logs allow us to identify bot scraping networks, brute-force login attempts, and quota circumvention scripts. We do NOT use invasive advertising tracking cookies or cross-site tracking beacons.
        </p>
      </section>

      {/* 5. Third Party Cookies */}
      <section id="third-party-cookies" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Third-Party Service Provider Cookies (Razorpay & Supabase)
        </h2>
        <p>
          When completing subscription transactions, Razorpay’s embedded checkout iframe may drop temporary fraud detection cookies to verify cardholder authorization and prevent carding attacks.
        </p>
      </section>

      {/* 6. Cookie Management */}
      <section id="cookie-management" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          6. Managing & Disabling Cookies
        </h2>
        <p>
          You can manage or disable cookies through your browser privacy settings (e.g., Chrome Settings &gt; Privacy and Security &gt; Cookies).
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
          Note: Disabling essential authentication cookies will prevent you from signing in to your NeoMCQ account or accessing paid study features.
        </p>
      </section>

      {/* 7. Updates */}
      <section id="cookie-updates" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          7. Policy Updates & Inquiries
        </h2>
        <p>
          Questions regarding cookie management may be submitted to <a href={`mailto:${LEGAL_CONFIG.privacyEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.privacyEmail}</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
