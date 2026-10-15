'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Eye, ImagePlus, Loader2, Monitor, RefreshCw,
  Save, Send, UploadCloud
} from 'lucide-react';
import { DEFAULT_HOMEPAGE_CONTENT, HomepageContent } from '@/lib/homepage-content';

export default function HomepageCustomizationPage() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [published, setPublished] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/homepage', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load homepage settings.');
      setPublished(result.published || DEFAULT_HOMEPAGE_CONTENT);
      setContent(result.draft || result.published || DEFAULT_HOMEPAGE_CONTENT);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load homepage settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSettings(); }, []);

  const update = (key: Exclude<keyof HomepageContent, 'banners'>, value: string) => {
    setContent((current) => ({ ...current, [key]: value }));
    setNotice('');
  };

  const save = async (action: 'save-draft' | 'publish') => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, content }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save homepage settings.');
      setContent(result.content);
      if (action === 'publish') {
        setPublished(result.content);
        setNotice('Homepage changes are published and now live.');
      } else {
        setNotice('Draft saved. The public homepage has not changed yet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save homepage settings.');
    } finally {
      setSaving(false);
    }
  };

  const uploadBanner = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/admin/homepage/upload', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Banner upload failed.');
      const asset = { name: file.name, url: result.url as string, alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') };
      setContent((current) => ({
        ...current,
        heroImageUrl: asset.url,
        heroImageAlt: asset.alt,
        banners: [asset, ...current.banners.filter((banner) => banner.url !== asset.url)].slice(0, 30),
      }));
      setNotice('Banner uploaded and selected. Save draft or publish to apply it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Banner upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[45vh] items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading homepage settings…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-700"><Monitor className="h-3.5 w-3.5" /> Website controls</div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Homepage Customization</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Edit the hero headline and switch between banner images. Preview your changes, save a draft, then publish without a code deployment.</p>
        </div>
        <button onClick={() => void loadSettings()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div><h2 className="text-lg font-extrabold">Hero content</h2><p className="mt-1 text-xs text-slate-500">Keep headlines short so they fit on desktop and mobile.</p></div>
          <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Headline — first line</span><input maxLength={120} value={content.heroHeadlineTop} onChange={(e) => update('heroHeadlineTop', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900" /></label>
          <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Headline — highlighted line</span><input maxLength={120} value={content.heroHeadlineHighlight} onChange={(e) => update('heroHeadlineHighlight', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900" /></label>
          <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Headline — final line</span><input maxLength={120} value={content.heroHeadlineBottom} onChange={(e) => update('heroHeadlineBottom', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900" /></label>
          <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Supporting text</span><textarea maxLength={600} rows={3} value={content.heroDescription} onChange={(e) => update('heroDescription', e.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary button label</span><input maxLength={60} value={content.primaryCtaLabel} onChange={(e) => update('primaryCtaLabel', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Secondary button label</span><input maxLength={60} value={content.secondaryCtaLabel} onChange={(e) => update('secondaryCtaLabel', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" /></label>
          </div>
          <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Image alt text</span><input maxLength={240} value={content.heroImageAlt} onChange={(e) => update('heroImageAlt', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" /></label>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button disabled={saving || uploading} onClick={() => void save('save-draft')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Draft'}</button>
            <button disabled={saving || uploading} onClick={() => void save('publish')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-violet-200 disabled:opacity-50"><Send className="h-4 w-4" />{saving ? 'Publishing…' : 'Publish Changes'}</button>
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50"><Eye className="h-4 w-4" />Open Homepage</a>
          </div>
        </section>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="font-extrabold">Live preview</h2><p className="text-xs text-slate-500">Preview of the current draft</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">DRAFT</span></div>
            <div className="bg-gradient-to-br from-sky-50 via-white to-violet-100 p-4 sm:p-5">
              <div className="rounded-xl border border-white/90 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-700">AI-powered exam preparation</p>
                <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950">{content.heroHeadlineTop}<br /><span className="bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent">{content.heroHeadlineHighlight}</span><br />{content.heroHeadlineBottom}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{content.heroDescription}</p>
                <img src={content.heroImageUrl} alt={content.heroImageAlt} className="mt-3 h-40 w-full rounded-lg object-contain" />
                <div className="mt-2 inline-flex rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">{content.primaryCtaLabel} →</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold">Banner library</h2><p className="mt-1 text-xs text-slate-500">Upload another banner or select one already uploaded.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-violet-700"><UploadCloud className="h-4 w-4" />{uploading ? 'Uploading…' : 'Upload'}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; void uploadBanner(file); e.currentTarget.value = ''; }} /></label></div>
            <p className="mt-2 text-[11px] text-slate-500">PNG, JPG, WebP, or AVIF · maximum 8 MB</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {content.banners.map((banner) => {
                const selected = content.heroImageUrl === banner.url;
                return <button key={banner.url} type="button" onClick={() => setContent((current) => ({ ...current, heroImageUrl: banner.url, heroImageAlt: banner.alt || banner.name }))} className={`overflow-hidden rounded-xl border text-left transition ${selected ? 'border-violet-500 ring-2 ring-violet-200' : 'border-slate-200 hover:border-violet-300 dark:border-slate-700'}`}>
                  <div className="flex h-28 items-center justify-center bg-gradient-to-br from-sky-50 to-violet-100 p-2"><img src={banner.url} alt={banner.alt || banner.name} className="h-full w-full object-contain" /></div>
                  <div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-xs font-bold">{banner.name}</span>{selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" /> : <ImagePlus className="h-4 w-4 shrink-0 text-slate-400" />}</div>
                </button>;
              })}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Selecting a banner changes the draft only. Publish to make it visible to visitors.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-extrabold">Currently published</p>
            <p className="mt-1">{published.heroHeadlineTop} {published.heroHeadlineHighlight} {published.heroHeadlineBottom}</p>
            <p className="mt-1 break-all text-[10px] text-slate-500">{published.heroImageUrl}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
