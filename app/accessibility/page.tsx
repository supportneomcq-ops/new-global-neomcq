import React from 'react';
import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';
import { LEGAL_CONFIG } from '@/lib/legal/config';
import { Accessibility, CheckCircle2, Eye, Keyboard, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accessibility Statement — NeoMCQ',
  description:
    'NeoMCQ commitment to digital accessibility, WCAG 2.1 AA standards, high-contrast dark/light mode designs, screen reader support, and keyboard navigation.',
};

export default function AccessibilityPage() {
  const toc = [
    { id: 'accessibility-commitment', title: '1. Our Accessibility Commitment' },
    { id: 'wcag-benchmarks', title: '2. Standards & WCAG 2.1 AA Conformance' },
    { id: 'accessibility-features', title: '3. Platform Accessibility Features' },
    { id: 'screen-reader-support', title: '4. Screen Readers & Assistive Technology' },
    { id: 'feedback-support', title: '5. Accessibility Feedback & Technical Assistance' },
  ];

  return (
    <LegalPageLayout
      title="Accessibility Statement"
      subtitle="NeoMCQ is dedicated to providing an inclusive, accessible learning environment for students, scholars, and candidates with diverse physical and cognitive needs."
      categoryName="Inclusivity"
      toc={toc}
    >
      {/* 1. Commitment */}
      <section id="accessibility-commitment" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          1. Our Accessibility Commitment
        </h2>
        <p>
          At <strong>{LEGAL_CONFIG.brandName}</strong>, we believe that world-class AI exam preparation tools should be accessible to all individuals regardless of ability, age, or technology. We continuously refine our web interfaces to meet modern digital accessibility standards.
        </p>
      </section>

      {/* 2. Standards */}
      <section id="wcag-benchmarks" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          2. Standards & WCAG 2.1 AA Conformance
        </h2>
        <p>
          We target full alignment with the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> standards established by the World Wide Web Consortium (W3C). These guidelines define best practices for making web content accessible to individuals with visual, auditory, motor, or cognitive impairments.
        </p>
      </section>

      {/* 3. Features */}
      <section id="accessibility-features" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          3. Platform Accessibility Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#6D5BFF]" />
              High-Contrast Lighting Options
            </p>
            <p>Support for crisp high-contrast dark mode and clean light mode to reduce eye strain during extended study sessions.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-[#00D4FF]" />
              Keyboard Navigation Support
            </p>
            <p>All core controls, option selection buttons, and modal dialogs feature visible focus states accessible via standard keyboard navigation (Tab / Shift+Tab / Enter / Space).</p>
          </div>
        </div>
      </section>

      {/* 4. Screen Readers */}
      <section id="screen-reader-support" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          4. Screen Readers & Assistive Technology
        </h2>
        <p>
          We implement semantic HTML elements (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">&lt;main&gt;</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">&lt;nav&gt;</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">&lt;section&gt;</code>), ARIA landmarks, and descriptive image alt-tags to optimize performance for screen readers such as NVDA, JAWS, and VoiceOver.
        </p>
      </section>

      {/* 5. Feedback */}
      <section id="feedback-support" className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          5. Accessibility Feedback & Technical Assistance
        </h2>
        <p>
          We welcome feedback regarding accessibility barriers you encounter while using NeoMCQ. Please contact our support team:
        </p>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1 text-xs sm:text-sm">
          <p><strong>Accessibility Support Email:</strong> <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-[#6D5BFF] underline">{LEGAL_CONFIG.supportEmail}</a></p>
          <p>When reporting an issue, please specify the web page URL, your operating system, and any assistive technology used. Our engineering team aims to respond within 2 business days.</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
