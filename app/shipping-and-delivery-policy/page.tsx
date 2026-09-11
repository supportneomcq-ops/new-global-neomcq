import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { Truck, CheckCircle2, Globe, Lock, ShieldCheck, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Digital Shipping & Delivery Policy — NeoMCQ',
  description:
    'Digital Delivery Policy for NeoMCQ online educational services, subscription feature activation, electronic delivery timelines, and Razorpay payment requirements.',
};

export default function ShippingAndDeliveryPolicyPage() {
  const toc = [
    { id: 'digital-nature-overview', title: '1. Purely Digital Software & Educational Services' },
    { id: 'no-physical-shipping', title: '2. No Physical Goods or Parcel Shipping' },
    { id: 'electronic-delivery-process', title: '3. Electronic Delivery & Instant Plan Activation' },
    { id: 'delivery-timelines', title: '4. Delivery Timelines & Verification' },
    { id: 'technical-requirements', title: '5. Technical Connectivity Requirements' },
    { id: 'delivery-support', title: '6. Delivery Failure Inquiries & Support' },
  ];

  return (
    <LegalPageLayout
      title="Shipping & Digital Delivery Policy"
      subtitle="This Policy describes the electronic delivery, plan activation, and service fulfillment mechanics for NeoMCQ digital educational software."
      categoryName="Digital Fulfillment"
      toc={toc}
    >
      {/* 1. Overview */}
      <section id="digital-nature-overview" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          1. Purely Digital Software & Educational Services
        </h2>
        <p>
          <strong>{LEGAL_CONFIG.brandName}</strong> is an entirely web-based, cloud-hosted educational technology software application. All educational tools—including practice MCQs, adaptive quizzes, active recall flashcards, printable A4 revision notes, AI Tutor whiteboards, and neural audio explanations—are delivered exclusively over the internet via digital access.
        </p>
      </section>

      {/* 2. No Physical Goods */}
      <section id="no-physical-shipping" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          2. No Physical Goods or Parcel Shipping
        </h2>
        
        <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm space-y-3">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <Truck className="w-5 h-5 text-[#6D5BFF]" />
            <span>Digital Fulfillment Notice — Zero Physical Courier Shipping</span>
          </div>
          <p className="leading-relaxed">
            Because NeoMCQ provides purely digital software and cloud learning tools:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>There are <strong>NO physical products, printed books, paper flashcards, CD-ROMs, or physical parcels shipped</strong> to user addresses.</li>
            <li>No postal courier fees, freight charges, or physical delivery tracking numbers apply to any purchase.</li>
            <li>Users are NOT required to provide a physical shipping destination to access learning materials.</li>
          </ul>
        </div>
      </section>

      {/* 3. Electronic Delivery Process */}
      <section id="electronic-delivery-process" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Electronic Delivery & Instant Plan Activation
        </h2>
        <p>
          Digital service fulfillment occurs through automated server-side entitlement provisioning:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-xs sm:text-sm">
          <li><strong>Payment Confirmation:</strong> Upon successful authorization of your payment via Razorpay, Razorpay issues a secure cryptographic webhook signature to NeoMCQ servers.</li>
          <li><strong>Automated Account Provisioning:</strong> Our backend entitlement engine immediately updates your user account record in our database, upgrading your plan status to <strong>Pro</strong>, <strong>Max</strong>, or <strong>Elite</strong>.</li>
          <li><strong>Instant Benefit Unlocking:</strong> Enhanced daily question quotas, elevated AI Tutor session limits, and $0 exam switch capabilities (for Elite members) become accessible instantly inside your user dashboard.</li>
          <li><strong>Electronic Receipt Email:</strong> An automated digital transaction receipt containing your Razorpay Order ID and subscription details is delivered to your registered email address.</li>
        </ol>
      </section>

      {/* 4. Delivery Timelines */}
      <section id="delivery-timelines" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Delivery Timelines & Verification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <p className="font-bold text-emerald-900 dark:text-emerald-300">Standard Delivery Window</p>
            <p className="text-emerald-950 dark:text-emerald-200">Instant (Within 0 to 60 seconds of Razorpay payment confirmation).</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-300">Banking Processing Exceptions</p>
            <p className="text-amber-950 dark:text-amber-200">In rare instances where international card issuers require additional 3D-Secure fraud verification, plan activation may take up to 15 minutes.</p>
          </div>
        </div>
      </section>

      {/* 5. Technical Requirements */}
      <section id="technical-requirements" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Technical Connectivity Requirements
        </h2>
        <p>
          Because digital content is rendered over cloud servers, users require:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-xs sm:text-sm">
          <li>A compatible modern web browser (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge).</li>
          <li>Active internet connectivity to generate real-time AI Tutor responses and synchronize question attempts.</li>
        </ul>
      </section>

      {/* 6. Support */}
      <section id="delivery-support" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          6. Delivery Failure Inquiries & Support
        </h2>
        <p>
          If your account status fails to reflect your paid subscription within 15 minutes of payment:
        </p>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1 text-xs sm:text-sm">
          <p>Contact our digital fulfillment team immediately at <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] font-semibold underline">{LEGAL_CONFIG.supportEmail}</a> or via <Link href="/contact-us" className="text-[#6D5BFF] font-semibold underline">Contact Us</Link>.</p>
          <p>Please include your account email and Razorpay payment reference number. Our technical team will manually verify the payment state and restore subscription access immediately.</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
