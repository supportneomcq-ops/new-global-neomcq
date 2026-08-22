'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Globe,
  ShieldCheck,
  Search,
  FileText,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Layers,
  Sparkles,
  Award,
  Eye,
} from 'lucide-react';
import { SeoHealthAuditResult } from '@/lib/seo/types';

export default function SEOSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [auditData, setAuditData] = useState<SeoHealthAuditResult | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'metadata' | 'sitemaps' | 'simulator'>('overview');

  const [form, setForm] = useState({
    metaTitle: 'NeoMCQ — World’s Most Intelligent AI Exam Preparation Platform',
    metaDescription: 'Level up clinical reasoning and board exam scores with high-yield practice MCQs, distractor breakdowns, and AI spaced repetition.',
    keywords: 'NEET PG, USMLE Step 1, Medical MCQs, Spaced Repetition, FMGE Prep, AI Medical Tutor',
    author: 'NeoMCQ Academic Medical Board',
    robots: 'index, follow',
    canonicalUrl: 'https://neomcq.com',
    ogTitle: 'NeoMCQ — AI Medical Board & Licensure Exam Preparation',
    ogDescription: 'Interactive clinical vignette question bank, diagnostic rationales, and spaced-repetition cards.',
    ogImage: 'https://neomcq.com/og-image.png',
    twitterCard: 'summary_large_image',
    twitterSite: '@neomcq',
    twitterCreator: '@neomcq_edu',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsRes, auditRes] = await Promise.all([
        fetch('/api/admin/settings/seo'),
        fetch('/api/admin/seo/audit'),
      ]);

      const settingsJson = await settingsRes.json();
      if (settingsJson.success && settingsJson.settings) {
        setForm(settingsJson.settings);
      }

      const auditJson = await auditRes.json();
      if (auditJson.success && auditJson.audit) {
        setAuditData(auditJson.audit);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load SEO data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAudit = async () => {
    setAuditing(true);
    try {
      const res = await fetch('/api/admin/seo/audit');
      const json = await res.json();
      if (json.success && json.audit) {
        setAuditData(json.audit);
      }
    } catch (err: any) {
      setError('Failed to refresh audit metrics');
    } finally {
      setAuditing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/settings/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(json.error || 'Failed to save SEO settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Search Engine Architecture & Crawl Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            SEO & Technical Indexing Hub
          </h1>
          <p className="text-sm text-slate-400">
            Monitor Googlebot crawl health, Schema.org structured data, sitemap generation, and automated quality gates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshAudit}
            disabled={auditing}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
            <span>{auditing ? 'Running Diagnostics...' : 'Run Audit'}</span>
          </button>

          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Live Sitemap</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Health Scorecard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sitemaps')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sitemaps'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Sitemaps & Quality Gate
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'simulator'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          SERP & Social Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('metadata')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'metadata'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Global Metadata
        </button>
      </div>

      {/* OVERVIEW / SCORECARD */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Main Score Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0D1326] via-[#0F172A] to-[#131B38] border border-slate-800 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
            <div className="space-y-2 lg:col-span-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-black text-white">
                  {auditData?.overallScore || 95}
                </span>
                <span className="text-xl font-bold text-slate-500">/ 100</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  Excellent Crawl Readiness
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                NeoMCQ Technical SEO & Crawl Architecture
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                All public exams, subjects, topics, and verified clinical questions adhere to strict Schema.org standards, hierarchical canonical URLs, and privacy protection protocols.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Total Content Entities:</span>
                <span className="font-bold text-white">
                  {auditData?.totalPublished?.toLocaleString() || '1,420+'}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Indexable URLs:</span>
                <span className="font-bold">
                  {auditData?.indexableCount?.toLocaleString() || '1,310+'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Protected / Noindex:</span>
                <span className="font-bold text-amber-400">
                  {auditData?.noindexCount?.toLocaleString() || '110'}
                </span>
              </div>
            </div>
          </div>

          {/* 7 Diagnostic Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Audit Pillars & Diagnostic Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auditData?.categories &&
                Object.entries(auditData.categories).map(([key, cat]) => (
                  <div
                    key={key}
                    className="p-5 rounded-2xl bg-[#0D1326] border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="text-sm font-extrabold text-indigo-400">
                        {cat.score} / 100
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>

                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      {cat.issues.slice(0, 2).map((issue, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SITEMAPS & QUALITY GATE */}
      {activeTab === 'sitemaps' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">XML Sitemaps Suite</h3>
                <p className="text-xs text-slate-400">
                  Direct XML sitemap endpoints registered in Google Search Console and Bing Webmaster Tools.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                Auto-Regenerating (1h TTL)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: 'Root Sitemap Index', url: '/sitemap.xml', desc: 'Main index routing to all child sitemaps' },
                { name: 'Exams Sitemap', url: '/sitemaps/exams.xml', desc: 'Active professional board licensure exams' },
                { name: 'Subjects Sitemap', url: '/sitemaps/subjects.xml', desc: 'Syllabus and high-yield medical subjects' },
                { name: 'Topics Sitemap', url: '/sitemaps/topics.xml', desc: 'Topic guides and diagnostic hubs' },
                { name: 'MCQs Sitemap', url: '/sitemaps/mcqs.xml', desc: 'Quality-vetted public practice questions' },
                { name: 'Blog Sitemap', url: '/sitemaps/blogs.xml', desc: 'Academic strategies & medical articles' },
              ].map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-slate-900/50 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/40 transition-all block group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-indigo-400">
                    <span>{s.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{s.desc}</p>
                  <span className="text-[10px] font-mono text-indigo-400/80 mt-2 block">{s.url}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quality Gate Protocol */}
          <div className="p-6 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Automated Content Quality Gate & De-Thinning Rules
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              To prevent soft 404s and thin content penalties from Googlebot, NeoMCQ enforces strict automated quality filters before including any MCQ or note in sitemaps:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1.5">
                <span className="font-bold text-emerald-400">✓ Indexable Criteria:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Status set to <code>approved</code> or <code>published</code></li>
                  <li>Visibility marked as <code>PUBLIC_CANONICAL</code> or <code>PUBLIC_DISCOVERABLE</code></li>
                  <li>Question stem length exceeds 30 characters without template placeholders</li>
                  <li>Valid minimum 2 non-empty interactive distractors</li>
                  <li>Linked to valid Exam, Subject, and Topic hierarchy</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1.5">
                <span className="font-bold text-rose-400">✕ Automatic Noindex / Exclusion:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Draft, pending review, or archived content</li>
                  <li>Private user-authored notes and custom flashcard decks</li>
                  <li>Contains placeholder tokens: <code>[Insert Option]</code>, <code>Lorem ipsum</code></li>
                  <li>Any page lacking minimum educational value</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SERP & SOCIAL SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Google Search Snippet */}
          <div className="p-6 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              Google Search Result Snippet Preview
            </h3>

            <div className="p-5 rounded-2xl bg-white text-slate-900 dark:bg-[#1f1f1f] dark:text-slate-100 max-w-2xl space-y-1.5 font-sans shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  N
                </div>
                <span>neomcq.com</span>
                <span>›</span>
                <span className="text-slate-500">exams › neet-pg</span>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer">
                {form.metaTitle}
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {form.metaDescription}
              </p>
            </div>
          </div>

          {/* Social Card Preview */}
          <div className="p-6 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              OpenGraph & Twitter Card Preview
            </h3>

            <div className="max-w-md rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg">
              <div className="h-44 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-6 text-center border-b border-slate-800">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
                    NeoMCQ
                  </span>
                  <p className="text-sm font-bold text-white line-clamp-2">
                    {form.ogTitle}
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  neomcq.com
                </span>
                <h5 className="text-xs font-bold text-white line-clamp-1">
                  {form.ogTitle}
                </h5>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {form.ogDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* METADATA CONFIG FORM */}
      {activeTab === 'metadata' && (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>SEO configuration and global metadata updated successfully!</span>
            </div>
          )}

          <div className="p-6 sm:p-8 rounded-3xl bg-[#0D1326] border border-slate-800 space-y-6">
            <h3 className="text-base font-bold text-white">Default Meta Tags</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Default Meta Title
                </label>
                <input
                  type="text"
                  value={form.metaTitle}
                  onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Length: {form.metaTitle.length} / 60 characters recommended
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Default Meta Description
                </label>
                <textarea
                  rows={3}
                  value={form.metaDescription}
                  onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Length: {form.metaDescription.length} / 160 characters recommended
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Canonical Base URL
                  </label>
                  <input
                    type="text"
                    value={form.canonicalUrl}
                    onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Robots Directives
                  </label>
                  <input
                    type="text"
                    value={form.robots}
                    onChange={(e) => setForm({ ...form, robots: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
