import React from 'react';
import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { ShieldAlert, AlertTriangle, CheckCircle2, DollarSign, Scale, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions — NeoMCQ Global Exam Preparation',
  description:
    'Official Terms & Conditions governing your use of NeoMCQ subscription plans, $2 exam switching, AI Tutor usage, entitlements, and international payments.',
};

export default function TermsAndConditionsPage() {
  const toc = [
    { id: 'acceptance-eligibility', title: '1. Acceptance, Scope & Eligibility' },
    { id: 'international-compliance', title: '2. International Users & Compliance' },
    { id: 'account-security', title: '3. Account Creation & Security Responsibilities' },
    { id: 'service-description', title: '4. Educational Platform & AI Service Scope' },
    { id: 'disclaimer-success', title: '5. No Guarantee of Exam Success or Specific Scores' },
    { id: 'exam-bodies', title: '6. Third-Party Examination Bodies & No Affiliation' },
    { id: 'intellectual-property', title: '7. Intellectual Property & License Grant' },
    { id: 'prohibited-conduct', title: '8. Prohibited Uses, Scraping & Quota Abuse' },
    { id: 'plans-entitlements', title: '9. Subscription Plans, Pricing & Quotas' },
    { id: 'exam-switching', title: '10. Curriculum Switching & $2.00 USD Switching Fee' },
    { id: 'content-freshness', title: '11. 30-Day Content Freshness System' },
    { id: 'payment-processing', title: '12. Razorpay Payment Processing & Taxes' },
    { id: 'cancellation-refunds', title: '13. Subscription Cancellation & Refunds' },
    { id: 'suspension-termination', title: '14. Account Suspension & Termination' },
    { id: 'warranties-liability', title: '15. Disclaimer of Warranties & Limitation of Liability' },
    { id: 'indemnification', title: '16. Indemnification Obligations' },
    { id: 'governing-disputes', title: '17. Governing Law & Dispute Resolution' },
    { id: 'contact-changes', title: '18. Amendments & Legal Contact' },
  ];

  return (
    <LegalPageLayout
      title="Terms & Conditions"
      subtitle="These Terms and Conditions constitute a legally binding agreement between you and NeoMCQ regarding your access to and use of our educational platform and subscriptions."
      categoryName="Legal Terms"
      toc={toc}
    >
      {/* 1. Acceptance, Scope & Eligibility */}
      <section id="acceptance-eligibility" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          1. Acceptance, Scope & Eligibility
        </h2>
        <p>
          By creating a NeoMCQ account, completing an onboarding step, making a payment, or accessing AI Tutor modules, you confirm that you have read, understood, and agreed to be bound by these Terms and Conditions (&quot;Terms&quot;).
        </p>
        <p>
          <strong>Eligibility:</strong> You represent and warrant that you possess the legal capacity to enter into a binding contract in your jurisdiction. If you are accessing NeoMCQ on behalf of an institution, academy, or organization, you represent that you have authority to bind that entity to these Terms.
        </p>
      </section>

      {/* 2. International Users */}
      <section id="international-compliance" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          2. International Users & Compliance
        </h2>
        <p>
          NeoMCQ is designed for candidates preparing for examinations across different countries and jurisdictions. We do not represent that the service is legally available or appropriate in every country. You are responsible for ensuring that your access to online AI educational services complies with all applicable local laws, export controls, and regulations in your country of residence.
        </p>
      </section>

      {/* 3. Account Creation & Security */}
      <section id="account-security" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Account Creation & Security Responsibilities
        </h2>
        <p>
          To access NeoMCQ, you must provide a valid email address and secure credentials.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Confidentiality:</strong> You are strictly responsible for maintaining the confidentiality of your account login credentials.</li>
          <li><strong>Personal Non-Transferable License:</strong> Accounts are strictly personal. You must NOT share your login credentials with colleagues, classmates, study groups, or public forums.</li>
          <li><strong>Unauthorized Access Notice:</strong> You must immediately notify <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.supportEmail}</a> if you suspect unauthorized access to your account.</li>
        </ul>
      </section>

      {/* 4. Service Description */}
      <section id="service-description" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Educational Platform & AI Service Scope
        </h2>
        <p>
          {LEGAL_CONFIG.platformDescription}
        </p>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Strict Educational Limitation Notice</span>
          </div>
          <p>
            NeoMCQ is NOT a medical clinic, hospital, diagnostic center, or professional healthcare provider. While exam questions and study guides cover clinical subjects, pharmacology, and anatomy, NeoMCQ provides purely educational exam-preparation tools and does NOT provide patient-specific medical diagnosis or clinical treatment advice.
          </p>
        </div>
      </section>

      {/* 5. No Guarantee of Success */}
      <section id="disclaimer-success" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          5. No Guarantee of Exam Success or Specific Scores
        </h2>
        <p>
          NeoMCQ provides practice drills, explanations, and flashcards to assist study routines. However, NeoMCQ makes NO representation or guarantee that using the platform will result in passing any examination, achieving a particular percentile, earning professional licensure, or securing job placements. Examination performance depends on individual candidate effort, prior training, and official exam administration conditions.
        </p>
      </section>

      {/* 6. Third-Party Exam Bodies */}
      <section id="exam-bodies" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          6. Third-Party Examination Bodies & No Affiliation
        </h2>
        <p>
          Examination titles, acronyms, and curriculum references (e.g., USMLE, PLAB, NCLEX, NEET-PG, MCCQE, AMC, Bar Exam) are trademarks or registered trademarks of their respective independent examination authorities. NeoMCQ is an independent preparation service and is NOT affiliated with, sponsored by, or endorsed by any official testing agency or licensing board unless explicitly stated.
        </p>
      </section>

      {/* 7. Intellectual Property */}
      <section id="intellectual-property" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          7. Intellectual Property & License Grant
        </h2>
        <p>
          All software code, UI designs, logos, database schemas, question structures, generated notes, and AI Tutor media are the intellectual property of NeoMCQ and its licensors.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Limited User License:</strong> Subject to compliance with these Terms, NeoMCQ grants you a personal, non-exclusive, non-transferable, revocable license to access and view study content for personal educational use.</li>
          <li><strong>User-Generated Content:</strong> You retain ownership of personal study notes or prompts you author. You grant NeoMCQ a non-exclusive license to process, store, and display your user inputs to operate the platform.</li>
        </ul>
      </section>

      {/* 8. Prohibited Conduct */}
      <section id="prohibited-conduct" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          8. Prohibited Uses, Scraping & Quota Abuse
        </h2>
        <p>
          You agree NOT to engage in any of the following prohibited activities:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
          <li>Automated web scraping, data mining, or programmatic extraction of MCQs, revision guides, or AI Tutor explanations.</li>
          <li>Reverse engineering, decompiling, or attempting to extract source code or underlying AI prompts.</li>
          <li>Circumventing daily question quotas, session limits, or user rate limits through automated scripts or multiple accounts.</li>
          <li>Sharing account credentials, proxying AI Tutor calls, or reselling platform access to third parties.</li>
          <li>Submitting malicious prompts intended to manipulate AI safety guardrails or disrupt platform stability.</li>
        </ul>
      </section>

      {/* 9. Plans & Entitlements */}
      <section id="plans-entitlements" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          9. Subscription Plans, Pricing & Quotas
        </h2>
        <p>
          NeoMCQ offers four distinct subscription tiers:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">FREE Plan ($0 USD)</p>
            <p>{LEGAL_CONFIG.limits.free}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">PRO Plan ($9.99 USD/mo)</p>
            <p>{LEGAL_CONFIG.limits.pro}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">MAX Plan ($19.99 USD/mo)</p>
            <p>{LEGAL_CONFIG.limits.max}</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-200">ELITE Plan ($499 USD/year)</p>
            <p className="text-amber-900 dark:text-amber-200">{LEGAL_CONFIG.limits.elite}</p>
          </div>
        </div>
      </section>

      {/* 10. Exam Switching */}
      <section id="exam-switching" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          10. Curriculum Switching & $2.00 USD Switching Fee
        </h2>
        <p>
          Your account is registered to a primary exam curriculum upon onboarding.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Free, Pro & Max Members:</strong> May switch their primary target curriculum at any time for a server-validated <strong>$2.00 USD curriculum switching fee</strong> per execution.</li>
          <li><strong>Elite Annual Members:</strong> Enjoy <strong>unlimited zero-fee curriculum switching ($0.00)</strong> throughout their 365-day active entitlement period.</li>
        </ul>
      </section>

      {/* 11. Content Freshness System */}
      <section id="content-freshness" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          11. 30-Day Content Freshness System
        </h2>
        <p>
          NeoMCQ utilizes a 30-day canonical content engine. Generated study sets and AI whiteboards younger than 30 days are served from cached canonical records. Once a content block passes 30 days, NeoMCQ generates a fresh version upon active candidate request to keep study materials updated against syllabus shifts.
        </p>
      </section>

      {/* 12. Razorpay Payments */}
      <section id="payment-processing" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          12. Razorpay Payment Processing & Taxes
        </h2>
        <p>
          Prices are displayed in USD ($). Payments are processed through Razorpay.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Currency & Conversion:</strong> Depending on your card issuing bank and country, Razorpay or your card issuer may apply local currency conversion or foreign transaction fees.</li>
          <li><strong>Taxes:</strong> Applicable statutory taxes, VAT/GST, or digital service levies will be calculated and disclosed during checkout where legally required.</li>
        </ul>
      </section>

      {/* 13. Cancellation & Refunds */}
      <section id="cancellation-refunds" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          13. Subscription Cancellation & Refunds
        </h2>
        <p>
          You may cancel your paid subscription at any time via your Billing Portal. Cancellation takes effect at the end of your current paid billing period. Refund requests are subject to our <a href="/refund-and-cancellation-policy" className="text-[#6D5BFF] underline font-semibold">Refund & Cancellation Policy</a>.
        </p>
      </section>

      {/* 14. Suspension & Termination */}
      <section id="suspension-termination" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          14. Account Suspension & Termination
        </h2>
        <p>
          NeoMCQ reserves the right to suspend or terminate accounts without prior notice in cases of severe violation, including web scraping, credential sharing, payment fraud, or abusive prompt attacks.
        </p>
      </section>

      {/* 15. Warranties & Liability */}
      <section id="warranties-liability" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          15. Disclaimer of Warranties & Limitation of Liability
        </h2>
        <p>
          THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEOMCQ DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED. NEOMCQ SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
        </p>
      </section>

      {/* 16. Indemnification */}
      <section id="indemnification" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          16. Indemnification Obligations
        </h2>
        <p>
          You agree to defend, indemnify, and hold harmless NeoMCQ, its directors, employees, and technology partners from any claims or damages resulting from your breach of these Terms or misuse of the platform.
        </p>
      </section>

      {/* 17. Governing Law */}
      <section id="governing-disputes" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          17. Governing Law & Dispute Resolution
        </h2>
        <p>
          These Terms are governed by applicable laws subject to business entity registration. Parties agree to seek informal resolution through <a href={`mailto:${LEGAL_CONFIG.legalEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.legalEmail}</a> prior to initiating formal dispute proceedings. Mandatory consumer protection rights under your local jurisdiction remain unaffected.
        </p>
      </section>

      {/* 18. Contact & Amendments */}
      <section id="contact-changes" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          18. Amendments & Legal Contact
        </h2>
        <p>
          For legal inquiries concerning these Terms:
        </p>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1 text-xs sm:text-sm">
          <p><strong>Legal Office Email:</strong> <a href={`mailto:${LEGAL_CONFIG.legalEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.legalEmail}</a></p>
          <p><strong>Support Email:</strong> <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.supportEmail}</a></p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
