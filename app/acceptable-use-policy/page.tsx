import React from 'react';
import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { Ban, ShieldAlert, AlertTriangle, CheckCircle2, Lock, FileCode } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — NeoMCQ',
  description:
    'Official Acceptable Use Policy for NeoMCQ. Rules governing platform security, prohibition of scraping, credential sharing, AI prompt abuse, and enforcement protocols.',
};

export default function AcceptableUsePolicyPage() {
  const toc = [
    { id: 'aup-purpose', title: '1. Purpose & Standards Overview' },
    { id: 'credential-sharing-rules', title: '2. Prohibition of Account & Credential Sharing' },
    { id: 'scraping-reverse-engineering', title: '3. Prohibition of Web Scraping & Reverse Engineering' },
    { id: 'quota-bypass-abuse', title: '4. Circumvention of Usage Quotas & System Rate Limits' },
    { id: 'ai-prompt-injection', title: '5. AI Tutor & Model Safety Guidelines' },
    { id: 'security-malware', title: '6. Platform Security & Malware Restrictions' },
    { id: 'enforcement-suspension', title: '7. Violation Monitoring & Account Termination' },
  ];

  return (
    <LegalPageLayout
      title="Acceptable Use Policy"
      subtitle="This Policy sets out the strict rules and standards of conduct governing all interaction with NeoMCQ software, APIs, database content, and AI Tutor engines."
      categoryName="Platform Rules"
      toc={toc}
    >
      {/* 1. Purpose */}
      <section id="aup-purpose" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          1. Purpose & Standards Overview
        </h2>
        <p>
          This Acceptable Use Policy (&quot;AUP&quot;) protects the integrity, security, availability, and intellectual property of <strong>{LEGAL_CONFIG.brandName}</strong>. Compliance with this policy is mandatory for all users across Free, Pro, Max, and Elite tiers.
        </p>
      </section>

      {/* 2. Credential Sharing */}
      <section id="credential-sharing-rules" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          2. Prohibition of Account & Credential Sharing
        </h2>
        <p>
          Each NeoMCQ user account is granted strictly as a single-user, personal license.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
          <li><strong>No Multi-User Credential Sharing:</strong> You must NOT share your login credentials with classmates, study circles, colleagues, or commercial test-prep organizations.</li>
          <li><strong>Automated Concurrent Session Auditing:</strong> Our security architecture monitors concurrent session locations and IP distribution patterns. Accounts detected making simultaneous automated requests from geographically disparate locations are flagged for security review.</li>
        </ul>
      </section>

      {/* 3. Scraping & Reverse Engineering */}
      <section id="scraping-reverse-engineering" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Prohibition of Web Scraping & Reverse Engineering
        </h2>
        <p>
          You are strictly forbidden from performing any automated data extraction:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
          <li><strong>No Bots, Crawlers or Scrapers:</strong> Using Headless Chrome, Selenium, Puppeteer, Scrapy, or custom scripts to download MCQs, explanations, flashcard decks, or revision guides is strictly prohibited.</li>
          <li><strong>No Decompilation:</strong> Decompiling, reverse engineering, or attempting to reconstruct NeoMCQ database schemas, prompt engineering instructions, or proprietary active recall algorithms.</li>
        </ul>
      </section>

      {/* 4. Quota Bypass */}
      <section id="quota-bypass-abuse" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Circumvention of Usage Quotas & System Rate Limits
        </h2>
        <p>
          Each subscription tier enforces server-side daily question, quiz, flashcard, and AI Tutor limits.
        </p>
        <p>
          Attempting to bypass tier quotas using multiple throwaway accounts, proxy IPs, automated header spoofing, or API tampering constitutes a severe breach of this AUP.
        </p>
      </section>

      {/* 5. AI Safety */}
      <section id="ai-prompt-injection" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          5. AI Tutor & Model Safety Guidelines
        </h2>
        <p>
          When submitting prompts to the interactive AI Tutor:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
          <li><strong>No Adversarial Jailbreaking:</strong> You must NOT attempt adversarial prompt injection attacks designed to bypass AI safety guardrails, extract system prompts, or induce offensive behavior.</li>
          <li><strong>Educational Relevance:</strong> Prompts must focus on academic study, exam prep, clinical science concepts, and learning queries. Submitting spam or abusive inputs is prohibited.</li>
        </ul>
      </section>

      {/* 6. Security */}
      <section id="security-malware" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          6. Platform Security & Malware Restrictions
        </h2>
        <p>
          Users must not probe, scan, or test the vulnerability of NeoMCQ servers, databases, or API routes without explicit written authorization from our security team. Injecting malware, SQL injection scripts, or XSS payloads will result in immediate law enforcement referral.
        </p>
      </section>

      {/* 7. Enforcement */}
      <section id="enforcement-suspension" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          7. Violation Monitoring & Account Termination
        </h2>
        <p>
          NeoMCQ reserves the right to immediately suspend or permanently ban accounts engaging in AUP violations without prior notice or refund entitlement.
        </p>
        <p>
          To report suspected security vulnerabilities or AUP breaches, contact <a href={`mailto:${LEGAL_CONFIG.securityEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.securityEmail}</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
