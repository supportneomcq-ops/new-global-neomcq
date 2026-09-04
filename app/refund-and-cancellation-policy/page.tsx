import React from 'react';
import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, HelpCircle, DollarSign, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — NeoMCQ Global Exam Preparation',
  description:
    'Official Refund and Cancellation Policy for NeoMCQ subscriptions, $2 exam switching fees, Razorpay processing times, and consumer refund requests.',
};

export default function RefundAndCancellationPolicyPage() {
  const toc = [
    { id: 'digital-nature', title: '1. Digital Service Nature & Instant Activation' },
    { id: 'cancellation-procedure', title: '2. Subscription Cancellation Procedure' },
    { id: 'refund-eligibility', title: '3. Refund Eligibility & Review Criteria' },
    { id: 'non-refundable-items', title: '4. Non-Refundable Services & Exam Switch Fees' },
    { id: 'elite-annual-policy', title: '5. Elite Annual Subscription Refund Terms' },
    { id: 'duplicate-billing', title: '6. Duplicate Billing & Technical Delivery Failures' },
    { id: 'refund-request-steps', title: '7. How to Submit a Refund Request' },
    { id: 'razorpay-processing', title: '8. Razorpay Processing Timelines & Exchange Rates' },
    { id: 'chargebacks-disputes', title: '9. Chargebacks & Payment Dispute Protocols' },
    { id: 'statutory-rights', title: '10. Mandatory Statutory Consumer Rights' },
  ];

  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      subtitle="This policy details the terms governing subscription cancellations, refund requests, $2.00 USD exam switching fee policies, and Razorpay transaction adjustments."
      categoryName="Billing & Refunds"
      toc={toc}
    >
      {/* 1. Digital Service Nature */}
      <section id="digital-nature" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          1. Digital Service Nature & Instant Activation
        </h2>
        <p>
          NeoMCQ is a purely digital, cloud-delivered educational platform. Upon successful payment verification via Razorpay, subscription features (such as daily MCQ quotas, AI Tutor sessions, and neural audio TTS) are activated immediately in your account.
        </p>
        <p>
          Because digital access is granted instantly upon payment confirmation, standard physical return mechanics do not apply. All purchase requests are governed by the criteria outlined in this policy.
        </p>
      </section>

      {/* 2. Cancellation Procedure */}
      <section id="cancellation-procedure" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          2. Subscription Cancellation Procedure
        </h2>
        <p>
          You may cancel your monthly or annual subscription at any time without penalty:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>One-Click Self-Service:</strong> Navigate to your <strong>Billing Portal</strong> inside your account settings and select &quot;Cancel Subscription&quot;.</li>
          <li><strong>Immediate Effect on Auto-Renewal:</strong> Cancellation stops future automatic recurring charges immediately.</li>
          <li><strong>Access Until Billing Period Expiry:</strong> Following cancellation, your paid plan benefits remain active until the exact conclusion of your current paid billing cycle. No partial prorated refund is issued automatically for unused remaining days in a routine cancellation.</li>
        </ul>
      </section>

      {/* 3. Refund Eligibility */}
      <section id="refund-eligibility" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Refund Eligibility & Review Criteria
        </h2>
        <p>
          To maintain fair operations while protecting candidates against technical errors, refund requests are evaluated according to the following guidelines:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          {/* Eligible Cases */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Eligible for Refund Review</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-emerald-950 dark:text-emerald-200 text-xs">
              <li><strong>Accidental Duplicate Charges:</strong> Charged twice for the same billing cycle due to a gateway lag or network timeout.</li>
              <li><strong>Verified Technical Non-Delivery:</strong> System failure preventing access to paid tier benefits for more than 48 consecutive hours after payment confirmation.</li>
              <li><strong>Unauthorized Fraudulent Transaction:</strong> Proven unauthorized card use reported within 72 hours of transaction.</li>
            </ul>
          </div>

          {/* Ineligible Cases */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-300">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Ineligible for Refund</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-rose-950 dark:text-rose-200 text-xs">
              <li>Change of mind after active consumption of daily MCQ quotas.</li>
              <li>Failure to pass an official examination (see Disclaimer).</li>
              <li>Forgotten subscription renewals where cancellation was not submitted prior to renewal execution.</li>
              <li>Account suspension due to terms violations (e.g. scraping).</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Non-Refundable Services */}
      <section id="non-refundable-items" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Non-Refundable Services & Exam Switch Fees
        </h2>
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs sm:text-sm">
          <p className="font-bold text-slate-900 dark:text-white">Distinct Distinction: $2.00 USD Exam Curriculum Switch Fee</p>
          <p>
            The <strong>$2.00 USD exam curriculum switching fee</strong> paid by Free, Pro, or Max members covers immediate server-side re-indexing and database schema re-alignment for your target exam. Once an exam switch transaction is executed and processed, the $2.00 USD switch fee is strictly non-refundable, unless a server malfunction prevented the curriculum re-alignment from completing.
          </p>
        </div>
      </section>

      {/* 5. Elite Annual Subscription Terms */}
      <section id="elite-annual-policy" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Elite Annual Subscription ($499 USD) Refund Terms
        </h2>
        <p>
          The <strong>Elite Annual Plan ($499 USD / year)</strong> grants 365 days of unlimited platform usage and zero exam switch fees.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>7-Day Grace Review Window:</strong> Elite annual subscribers may request a full refund within 7 calendar days of initial purchase, provided fewer than 100 total questions or AI Tutor whiteboards have been generated during that period.</li>
          <li><strong>After 7 Days:</strong> Elite annual plans are non-refundable for partial unused months.</li>
        </ul>
      </section>

      {/* 6. Duplicate Billing */}
      <section id="duplicate-billing" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          6. Duplicate Billing & Technical Delivery Failures
        </h2>
        <p>
          In the event of duplicate billing caused by payment network timeouts, our billing team will verify the Razorpay logs and issue a full credit refund to your original payment method for the duplicate charge within 3–5 business days.
        </p>
      </section>

      {/* 7. How to Submit Request */}
      <section id="refund-request-steps" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          7. How to Submit a Refund Request
        </h2>
        <p>
          To request a refund review:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-xs sm:text-sm">
          <li>Send an email to <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] font-semibold underline">{LEGAL_CONFIG.supportEmail}</a> or use our <a href="/contact-us" className="text-[#6D5BFF] font-semibold underline">Contact Us portal</a> selecting category &quot;Refund Request&quot;.</li>
          <li>Include your account email address, Razorpay Payment ID (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">pay_XXXXX</code>), purchase date, and reason for the request.</li>
          <li>Our billing team will review your request and respond within 24 to 48 business hours.</li>
        </ol>
      </section>

      {/* 8. Razorpay Processing */}
      <section id="razorpay-processing" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          8. Razorpay Processing Timelines & Exchange Rates
        </h2>
        <p>
          Approved refunds are processed through Razorpay back to your original payment card, UPI, or bank account.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
          <li><strong>Processing Window:</strong> Razorpay typically credits refunded funds within 5 to 10 international banking business days depending on your issuing bank.</li>
          <li><strong>Currency Exchange Rates:</strong> Refunds are issued in the original transaction currency (USD). NeoMCQ is not responsible for minor currency fluctuations or cross-border conversion adjustments imposed by your card issuer during refund processing.</li>
        </ul>
      </section>

      {/* 9. Chargebacks */}
      <section id="chargebacks-disputes" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          9. Chargebacks & Payment Dispute Protocols
        </h2>
        <p>
          We strongly encourage candidates to contact <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.supportEmail}</a> before initiating a credit card chargeback with their bank. Unilateral chargebacks initiated without prior contact may result in immediate account suspension pending dispute resolution.
        </p>
      </section>

      {/* 10. Statutory Rights */}
      <section id="statutory-rights" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          10. Mandatory Statutory Consumer Rights
        </h2>
        <p>
          Nothing in this policy limits or waives non-excludable statutory rights granted to consumers under local legislation (such as EU Directive 2011/83/EU on digital content supply or local consumer guarantees). Where local mandatory laws provide non-waivable refund rights, those statutory protections prevail.
        </p>
      </section>
    </LegalPageLayout>
  );
}
