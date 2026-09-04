import React from 'react';
import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { ShieldCheck, Lock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — NeoMCQ Global Exam Preparation',
  description:
    'Comprehensive Privacy Policy for NeoMCQ. Learn how we handle account data, AI Tutor prompts, Razorpay payment processing, and regional privacy rights.',
};

export default function PrivacyPolicyPage() {
  const toc = [
    { id: 'introduction', title: '1. Introduction & Platform Scope' },
    { id: 'operator-identity', title: '2. Operating Entity & Platform Description' },
    { id: 'information-collected', title: '3. Information We Collect' },
    { id: 'learning-ai-data', title: '4. Educational Activity, Prompts & AI Content' },
    { id: 'payment-processing', title: '5. Payment Information & Razorpay Processing' },
    { id: 'technical-cookies', title: '6. Technical Data, Logs & Cookies' },
    { id: 'data-usage', title: '7. How We Use Your Information' },
    { id: 'data-retention-deletion', title: '8. Data Retention & Account Deletion' },
    { id: 'third-party-providers', title: '9. Third-Party Service Providers' },
    { id: 'international-transfers', title: '10. International Data Transfers' },
    { id: 'gdpr-uk-rights', title: '11. EU & UK GDPR Data Subject Rights' },
    { id: 'ccpa-california', title: '12. California Privacy Rights (CCPA / CPRA)' },
    { id: 'regional-rights', title: '13. Other Regional Privacy Rights' },
    { id: 'automated-processing', title: '14. Automated Processing & AI Personalization' },
    { id: 'children-privacy', title: '15. Children’s Digital Privacy' },
    { id: 'security-incidents', title: '16. Data Security & Incident Response' },
    { id: 'privacy-contact', title: '17. Privacy Contact & Policy Updates' },
  ];

  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="This Policy describes how NeoMCQ collects, processes, protects, and stores user information across our global online educational technology platform."
      categoryName="Privacy & Security"
      toc={toc}
    >
      {/* 1. Introduction & Scope */}
      <section id="introduction" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          1. Introduction & Scope
        </h2>
        <p>
          Welcome to <strong>{LEGAL_CONFIG.brandName}</strong>. We recognize that privacy, confidentiality, and security are fundamental considerations for students, professionals, candidates, and scholars worldwide. This Privacy Policy details our practices concerning the collection, storage, processing, transfer, and disclosure of personal data when you interact with the NeoMCQ web application, APIs, user accounts, and study tools.
        </p>
        <p>
          By creating an account, accessing educational modules, submitting prompts to our AI Tutor, or subscribing to paid tiers on NeoMCQ, you acknowledge the data handling practices described in this document. If you do not agree with these practices, you must discontinue platform use.
        </p>
      </section>

      {/* 2. Operator Identity */}
      <section id="operator-identity" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          2. Operating Entity & Platform Description
        </h2>
        <p>
          {LEGAL_CONFIG.platformDescription}
        </p>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Important Distinction Regarding Healthcare & Clinical Services</span>
          </div>
          <p>
            NeoMCQ is NOT a medical clinic, hospital, healthcare provider, diagnostic service, telemedicine service, or medical consultation portal. While certain educational study modules involve clinical sciences, medical licensure preparation, nursing, or pharmacology, NeoMCQ provides purely educational exam-preparation tools and does not deliver medical advice or healthcare services.
          </p>
        </div>
      </section>

      {/* 3. Information We Collect */}
      <section id="information-collected" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Information We Collect
        </h2>
        <p>
          We collect several categories of information to operate, secure, and personalize the platform:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account & Authentication Information:</strong> Email address, hashed authentication credentials, unique account identifiers, sign-in timestamps, and authentication tokens issued via Supabase Auth.
          </li>
          <li>
            <strong>Profile & Preferences:</strong> Full name, target examination (e.g., USMLE, PLAB, NCLEX, NEET-PG), target exam year, specialty interest, selected primary curriculum, and UI theme preferences.
          </li>
          <li>
            <strong>Exam & Subject Selections:</strong> Selected subjects, subtopics, study mode choices, difficulty preferences, and custom syllabus filters.
          </li>
        </ul>
      </section>

      {/* 4. Educational Activity, Prompts & AI Content */}
      <section id="learning-ai-data" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Educational Activity, Prompts & AI Content
        </h2>
        <p>
          To deliver adaptive study tools, track knowledge retention, and render AI Tutor lessons, we record user interaction data:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>MCQ & Quiz Performance:</strong> Question attempts, selected options, correctness, time spent per item, error patterns, revision bookmarks, and active recall drill scores.
          </li>
          <li>
            <strong>User Notes & Saved Content:</strong> User-created Sticky Notes, custom text highlights, saved flashcards, and A4 revision note bookmarks.
          </li>
          <li>
            <strong>AI Tutor Conversations & Prompts:</strong> Text prompts, questions, and audio requests submitted to the interactive AI Tutor. Prompts are transmitted to secure AI model endpoints (such as OpenAI or Google Gemini) to generate step-by-step whiteboard explanations and high-speed neural audio (TTS).
          </li>
          <li>
            <strong>30-Day Canonical Content System:</strong> AI-generated study materials (MCQs, revision notes, tutor whiteboards) are stored in our central database for up to 30 days. Shared canonical content is reused across candidate requests to reduce redundant AI compute while maintaining freshness. Users explicitly acknowledge that AI outputs are stored and versioned to provide historical learning continuity.
          </li>
        </ul>
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">AI Accuracy Disclaimer:</p>
          <p>
            AI model outputs can occasionally contain inaccuracies or incomplete explanations. Users should verify high-stakes clinical or technical information with official authoritative textbooks and examination handbooks.
          </p>
        </div>
      </section>

      {/* 5. Payment Information & Razorpay Processing */}
      <section id="payment-processing" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Payment Information & Razorpay Processing
        </h2>
        <p>
          All commercial transactions, subscription upgrades (Pro, Max, Elite), and one-time exam curriculum switch fees ($2.00 USD) are processed securely through <strong>Razorpay</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>No Sensitive Card Storage:</strong> NeoMCQ does NOT collect, store, or transmit raw credit card numbers, debit card numbers, CVVs, or banking PINs on its own servers. All payment credential inputs are captured inside Razorpay’s PCI-DSS compliant iframe/checkout element.
          </li>
          <li>
            <strong>Transaction Metadata Recorded:</strong> For account verification, billing records, and tax compliance, NeoMCQ stores transaction metadata: Razorpay Payment ID, Order ID, subscription tier, canonical price in USD, payment status, transaction timestamp, and billing country.
          </li>
          <li>
            <strong>Razorpay Legal Policies:</strong> Payment processing is governed by Razorpay’s Privacy Policy and terms. You may inspect Razorpay’s official compliance standards at <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-[#6D5BFF] dark:text-[#00D4FF] underline">https://razorpay.com/privacy/</a>.
          </li>
        </ul>
      </section>

      {/* 6. Technical Data, Logs & Cookies */}
      <section id="technical-cookies" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          6. Technical Data, Logs & Cookies
        </h2>
        <p>
          When you access NeoMCQ, our servers automatically log technical request headers:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Device & Security Logs:</strong> IP address, user-agent string, operating system version, browser type, referrer URLs, request timestamps, and API response status codes.
          </li>
          <li>
            <strong>Essential Cookies & Storage:</strong> We use local storage and essential session cookies for authentication state, CSRF protection, and UI theme preferences (dark/light mode).
          </li>
        </ul>
      </section>

      {/* 7. How We Use Your Information */}
      <section id="data-usage" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          7. How We Use Your Information
        </h2>
        <p>
          NeoMCQ processes user personal data strictly for lawful, legitimate business purposes:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">Service Delivery & Quotas</p>
            <p>To authenticate accounts, render study modules, manage daily quota limits, and deliver active subscriptions.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">AI Personalization</p>
            <p>To tailor AI Tutor whiteboard responses and flashcard drills to your specific curriculum, weakness areas, and exam timeline.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">Fraud Prevention & Security</p>
            <p>To detect credential sharing, automated bot scraping, quota circumvention, and unauthorized API exploitation.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">Support & Communication</p>
            <p>To respond to support inquiries submitted via <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.supportEmail}</a> and send billing notices.</p>
          </div>
        </div>
      </section>

      {/* 8. Data Retention & Account Deletion */}
      <section id="data-retention-deletion" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          8. Data Retention & Account Deletion
        </h2>
        <p>
          We retain personal data for as long as your account remains active. Upon requesting account deletion via <a href={`mailto:${LEGAL_CONFIG.privacyEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.privacyEmail}</a> or our Contact Us portal:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Account credentials, user profiles, and saved notes are purged or permanently anonymized within 30 days.</li>
          <li>
            <strong>Exceptions:</strong> Transaction logs, Razorpay order references, and tax ledger records are retained for mandatory statutory periods required by financial regulators (typically 5–7 years).
          </li>
        </ul>
      </section>

      {/* 9. Third-Party Service Providers */}
      <section id="third-party-providers" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          9. Third-Party Service Providers
        </h2>
        <p>
          NeoMCQ engages trusted third-party infrastructure vendors who process data under strict data protection agreements:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Supabase Inc.:</strong> Managed PostgreSQL database hosting, user authentication (Supabase Auth), and row-level security enforcement.</li>
          <li><strong>Razorpay Software Pvt. Ltd.:</strong> Secure international credit card processing, subscription management, and webhook verification.</li>
          <li><strong>OpenAI LLC & Google LLC (Gemini API):</strong> Enterprise AI model processing endpoints for educational prompt completions and neural audio synthesis.</li>
          <li><strong>Cloud Infrastructure (Vercel / Cloud Run):</strong> Edge server hosting, SSL encryption, and application execution environments.</li>
        </ul>
      </section>

      {/* 10. International Data Transfers */}
      <section id="international-transfers" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          10. International Data Transfers
        </h2>
        <p>
          NeoMCQ serves users internationally across multiple continents. Your personal information may be transferred to, stored, and processed in secure data centers located in the United States, Europe, or other cloud server regions. Where required, we rely on standard contractual clauses (SCCs) and adequacy frameworks to safeguard cross-border transfers.
        </p>
      </section>

      {/* 11. EU & UK GDPR Data Subject Rights */}
      <section id="gdpr-uk-rights" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          11. EU & UK GDPR Data Subject Rights
        </h2>
        <p>
          If you reside in the European Economic Area (EEA) or the United Kingdom, you possess specific legal rights under Regulation (EU) 2016/679 (GDPR) and UK GDPR:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Right of Access (Art. 15):</strong> Request a copy of all personal data held by NeoMCQ.</li>
          <li><strong>Right to Rectification (Art. 16):</strong> Correct inaccurate or incomplete profile data.</li>
          <li><strong>Right to Erasure / Right to be Forgotten (Art. 17):</strong> Request deletion of your personal data subject to legal retention exceptions.</li>
          <li><strong>Right to Restriction & Objection (Art. 18 & 21):</strong> Object to processing based on legitimate interests.</li>
          <li><strong>Right to Data Portability (Art. 20):</strong> Request your learning data in a structured, machine-readable JSON format.</li>
        </ul>
        <p>
          To exercise GDPR rights, contact <a href={`mailto:${LEGAL_CONFIG.privacyEmail}`} className="text-[#6D5BFF] font-semibold underline">{LEGAL_CONFIG.privacyEmail}</a>.
        </p>
      </section>

      {/* 12. California Privacy Rights */}
      <section id="ccpa-california" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          12. California Privacy Rights (CCPA / CPRA)
        </h2>
        <p>
          Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), California residents have specific privacy rights:
        </p>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>No Sale or Sharing of Personal Information</span>
          </div>
          <p className="text-emerald-900 dark:text-emerald-200">
            NeoMCQ does NOT sell personal information to third-party data brokers, nor do we share personal information for cross-context behavioral advertising.
          </p>
        </div>
        <p>
          California users may request access to or deletion of their data twice per 12-month period without discrimination.
        </p>
      </section>

      {/* 13. Other Regional Rights */}
      <section id="regional-rights" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          13. Other Regional Privacy Rights
        </h2>
        <p>
          Users in Canada (PIPEDA), Australia (Privacy Act 1988), India (DPDP Act 2023), Brazil (LGPD), and other jurisdictions enjoy local statutory privacy protections. NeoMCQ processes all privacy requests in accordance with applicable non-waivable laws.
        </p>
      </section>

      {/* 14. Automated Processing */}
      <section id="automated-processing" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          14. Automated Processing & AI Personalization
        </h2>
        <p>
          NeoMCQ uses automated algorithms solely to recommend subtopics, generate adaptive flashcards, and calculate knowledge radar metrics. We do NOT use automated decision-making to produce legal effects or similarly significant decisions affecting individuals.
        </p>
      </section>

      {/* 15. Children's Privacy */}
      <section id="children-privacy" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          15. Children’s Digital Privacy
        </h2>
        <p>
          NeoMCQ is designed for academic exam candidates, university students, and professional licensure candidates. We do not knowingly collect or solicit personal information from children under 16 (or the applicable digital consent age in your jurisdiction) without verified parental/guardian consent.
        </p>
      </section>

      {/* 16. Security Incidents */}
      <section id="security-incidents" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          16. Data Security & Incident Response
        </h2>
        <p>
          We enforce 256-bit SSL transport encryption, Supabase database Row-Level Security (RLS), and API authentication checks. In the event of a confirmed security incident impacting user data, NeoMCQ will notify affected users and applicable regulatory bodies as required by law.
        </p>
      </section>

      {/* 17. Contact & Updates */}
      <section id="privacy-contact" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          17. Privacy Contact & Policy Updates
        </h2>
        <p>
          For privacy inquiries, GDPR data requests, CCPA rights execution, or account deletion:
        </p>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs sm:text-sm">
          <p><strong>Privacy Office Email:</strong> <a href={`mailto:${LEGAL_CONFIG.privacyEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.privacyEmail}</a></p>
          <p><strong>General Support Email:</strong> <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.supportEmail}</a></p>
          <p><strong>Effective Date:</strong> {LEGAL_CONFIG.effectiveDate}</p>
          <p><strong>Last Updated:</strong> {LEGAL_CONFIG.lastUpdated}</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
