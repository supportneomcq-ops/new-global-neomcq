'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Save, Send, Upload, AlertCircle } from 'lucide-react';
import { DEFAULT_HOMEPAGE_CONTENT, type HomepageContent } from '@/lib/homepage-content';

type SaveAction = 'save-draft' | 'publish';

export default function HomepageCustomizationPage() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [published, setPublished] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SaveAction | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadAlt, setUploadAlt] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin/homepage', { cache: 'no-store' });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Could not load homepage settings.');
        }
        if (active) {
          setPublished(result.published || DEFAULT_HOMEPAGE_CONTENT);
          setContent(result.draft || result.published || DEFAULT_HOMEPAGE_CONTENT);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load homepage settings.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const update = <K extends keyof HomepageContent>(key: K, value: HomepageContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const chooseBanner = (url: string) => {
    const banner = content.banners.find((item) => item.url === url);
    setContent((current) => ({
      ...current,
      heroImageUrl: url,
      heroImageAlt: banner?.alt || current.heroImageAlt,
    }));
    setMessage('');
  };

  const uploadBanner = async () => {
    if (!file) {
      setError('Choose a banner image first.');
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('alt', uploadAlt.trim());
      const response = await fetch('/api/admin/homepage/upload', { method: 'POST', body: form });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success || !result?.url) {
        throw new Error(result?.error || 'Image upload failed.');
      }
      const banner = {
        name: String(result.name || file.name).slice(0, 120),
        url: String(result.url),
        alt: uploadAlt.trim().slice(0, 240) || String(result.name || file.name).slice(0, 240),
      };
      setContent((current) => ({
        ...current,
        heroImageUrl: banner.url,
        heroImageAlt: banner.alt,
        banners: [banner, ...current.banners.filter((item) => item.url !== banner.url)].slice(0, 30),
      }));
      setFile(null);
      setUploadAlt('');
      setMessage('Banner uploaded. Save a draft or publish to make it live.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (action: SaveAction) => {
    setSaving(action);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, content }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Homepage settings could not be saved.');
      }
      const saved = result.content || content;
      setContent(saved);
      if (action === 'publish') {
        setPublished(saved);
        setMessage('Homepage changes published successfully.');
      } else {
        setMessage('Draft saved. The public homepage has not changed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Homepage settings could not be saved.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-background p-8 text-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-violet-600" /> Loading homepage settings…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200">
              <ArrowLeft className="h-4 w-4" /> Admin dashboard
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Homepage Customization</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Manage the hero copy and banner assets. Drafts stay private until you publish.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void save('save-draft')} disabled={saving !== null || uploading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              {saving === 'save-draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
            </button>
            <button type="button" onClick={() => void save('publish')} disabled={saving !== null || uploading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-violet-500/20 transition hover:brightness-105 disabled:opacity-60">
              {saving === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish Changes
            </button>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Hero content</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Keep headlines concise so they fit on mobile and desktop.</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Headline — first line</span>
              <input value={content.heroHeadlineTop} maxLength={120} onChange={(e) => update('heroHeadlineTop', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Highlighted headline</span>
              <input value={content.heroHeadlineHighlight} maxLength={120} onChange={(e) => update('heroHeadlineHighlight', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Headline — third line</span>
              <input value={content.heroHeadlineBottom} maxLength={120} onChange={(e) => update('heroHeadlineBottom', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Supporting text</span>
              <textarea value={content.heroDescription} maxLength={600} rows={3} onChange={(e) => update('heroDescription', e.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Primary button</span>
                <input value={content.primaryCtaLabel} maxLength={60} onChange={(e) => update('primaryCtaLabel', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Secondary button</span>
                <input value={content.secondaryCtaLabel} maxLength={60} onChange={(e) => update('secondaryCtaLabel', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
            </div>
          </section>

          <div className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Hero banner</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Select an uploaded banner or enter an existing public image URL.</p>
              </div>
              {content.banners.length > 0 && (
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Banner library</span>
                  <select value={content.heroImageUrl} onChange={(e) => chooseBanner(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    {!content.banners.some((banner) => banner.url === content.heroImageUrl) && <option value={content.heroImageUrl}>Custom image URL</option>}
                    {content.banners.map((banner) => <option key={banner.url} value={banner.url}>{banner.name}</option>)}
                  </select>
                </label>
              )}
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Image URL</span>
                <input value={content.heroImageUrl} onChange={(e) => update('heroImageUrl', e.target.value)} placeholder="/assets/student-welcome-banner.webp or https://…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Accessible image description</span>
                <input value={content.heroImageAlt} maxLength={240} onChange={(e) => update('heroImageAlt', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>

              <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/20">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><ImagePlus className="h-4 w-4 text-violet-600 dark:text-violet-300" /> Upload a new banner</div>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:font-bold file:text-white hover:file:bg-violet-700 dark:text-slate-200" />
                <label className="mt-3 block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Image description (optional)</span>
                  <input value={uploadAlt} maxLength={240} onChange={(e) => setUploadAlt(e.target.value)} placeholder="Describe the banner for screen readers" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                </label>
                <button type="button" onClick={() => void uploadBanner()} disabled={!file || uploading || saving !== null} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-60">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload and Select
                </button>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">PNG, JPEG, WebP, or AVIF · Maximum 8 MB.</p>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Live preview</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">Draft preview</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-sky-50 via-white to-violet-100 p-4 dark:border-violet-800 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/50">
                <div className="grid items-center gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">AI-powered exam preparation</p>
                    <h3 className="mt-2 text-xl font-black leading-tight text-slate-900 dark:text-slate-100">{content.heroHeadlineTop}<br /><span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">{content.heroHeadlineHighlight}</span><br />{content.heroHeadlineBottom}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{content.heroDescription}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">{content.primaryCtaLabel}</span>
                      <span className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{content.secondaryCtaLabel}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/80 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-950/60">
                    <img src={content.heroImageUrl} alt={content.heroImageAlt} className="mx-auto max-h-56 w-full object-contain" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Currently published image: {published.heroImageUrl}</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
