'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, RotateCcw, Upload, Image as ImageIcon, Trash } from 'lucide-react';

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    logoUrl: '',
    darkLogoUrl: '',
    faviconUrl: '',
    appleTouchIconUrl: '',
    pwaIconUrl: '',
    loginLogoUrl: '',
    emailLogoUrl: '',
    ogImageUrl: '',
    platformName: '',
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings/branding');
      const json = await res.json();
      if (json.success) {
        setForm(json.settings);
      } else {
        setError(json.error || 'Failed to load branding settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm(json.settings);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSimulatedUpload = (field: keyof typeof form) => {
    // Elegant simulated client-side mock upload representing secure Cloudflare R2 / Supabase Storage integration
    const promptUrl = window.prompt(`Enter public asset URL for ${field.replace('Url', '')}:`, form[field]);
    if (promptUrl !== null) {
      // Simple validation of the URL extension
      if (promptUrl && !promptUrl.match(/\.(jpeg|jpg|gif|png|ico|svg|webp)/i)) {
        alert('Invalid file format. Please upload an image with a valid extension (png, jpg, webp, ico, etc.).');
        return;
      }
      setForm({ ...form, [field]: promptUrl });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-[#6D5BFF] animate-spin" />
      </div>
    );
  }

  const BRANDING_ITEMS = [
    { label: 'Platform Logo (Light Mode)', key: 'logoUrl' as const, description: 'Display logo for white backgrounds.' },
    { label: 'Platform Logo (Dark Mode)', key: 'darkLogoUrl' as const, description: 'Display logo for navy/black backgrounds.' },
    { label: 'Favicon Icon (32x32)', key: 'faviconUrl' as const, description: 'Browser tab icon.' },
    { label: 'Apple Touch Icon (180x180)', key: 'appleTouchIconUrl' as const, description: 'iOS home screen bookmark icon.' },
    { label: 'PWA Icon (192x192)', key: 'pwaIconUrl' as const, description: 'Progressive Web App launch icon.' },
    { label: 'Login Panel Logo', key: 'loginLogoUrl' as const, description: 'Centered logo on /login portal.' },
    { label: 'Email Templates Logo', key: 'emailLogoUrl' as const, description: 'Header logo embedded in automated transactional emails.' },
    { label: 'Open Graph Image (1200x630)', key: 'ogImageUrl' as const, description: 'Default rich image used on social link previews.' },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Branding configurations saved and synchronized.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
          General Brand Identity
        </h2>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canonical Brand Name</label>
          <input
            type="text"
            required
            value={form.platformName}
            onChange={(e) => setForm({ ...form, platformName: e.target.value })}
            className="w-full max-w-md p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {BRANDING_ITEMS.map((item) => (
          <div key={item.key} className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-3.5 flex flex-col justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">{item.label}</div>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
            </div>

            {/* Asset Preview Frame */}
            <div className="h-28 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-gray-800 flex items-center justify-center relative overflow-hidden group">
              {form[item.key] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={form[item.key]}
                  alt={item.label}
                  className="max-h-full max-w-full object-contain p-2"
                  onError={(e) => {
                    (e.target as any).src = 'https://picsum.photos/seed/broken/100';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-[9px] font-medium uppercase tracking-wider">No Image Configured</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Asset direct URL..."
                value={form[item.key]}
                onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 text-[10px] text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSimulatedUpload(item.key)}
                className="p-2 px-3 rounded-xl bg-[#6D5BFF]/10 hover:bg-[#6D5BFF]/20 text-[#6D5BFF] text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                title="Upload/Select File"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
              {form[item.key] && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, [item.key]: '' })}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all shrink-0"
                  title="Remove Asset"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-gray-800">
        <button
          type="button"
          onClick={loadSettings}
          className="p-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Assets</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="p-2.5 px-6 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-[#6D5BFF]/10"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Branding Identity</span>
        </button>
      </div>
    </form>
  );
}
