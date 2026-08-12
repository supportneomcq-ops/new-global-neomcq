'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCode,
  CheckCircle2,
  Edit,
  Eye,
  Save,
  ArrowLeft,
  RefreshCw,
  Zap,
  AlertCircle,
} from 'lucide-react';

export default function AdminEmailTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);

  // Selected for Edit
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [editActive, setEditActive] = useState(true);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email/templates');
      const json = await res.json();
      if (json.success) {
        setTemplates(json.templates || []);
      }
    } catch (err) {
      console.error('Failed to load email templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenEdit = (t: any) => {
    setActiveTemplate(t);
    setEditName(t.name);
    setEditSubject(t.subject);
    setEditHtml(t.body_html || '');
    setEditActive(t.is_active ?? true);
    setPreviewMode(false);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTemplate.id,
          name: editName,
          subject: editSubject,
          body_html: editHtml,
          is_active: editActive,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActiveTemplate(null);
        loadTemplates();
      } else {
        alert(json.error || 'Failed to save template');
      }
    } catch (err) {
      console.error('Save template error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/email"
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <FileCode className="w-6 h-6 text-[#6D5BFF]" />
              <span>Transactional Email Templates</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Customize automated email flows, subject lines, HTML layouts, and dynamic merge variables.
            </p>
          </div>
        </div>

        <button
          onClick={loadTemplates}
          className="p-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 font-bold">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
            <span>Loading email templates...</span>
          </div>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                    Slug: {t.slug}
                  </span>
                  {t.is_active ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-500">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-500/10 text-slate-400">Disabled</span>
                  )}
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {t.name}
                </h3>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium text-slate-600 dark:text-gray-300">
                  <strong className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Subject Line:</strong>
                  {t.subject}
                </div>

                {t.variables && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {t.variables.map((v: string) => (
                      <span key={v} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-[10px] font-mono text-slate-400">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold">
                  Version v{t.version || 1}
                </span>

                <button
                  onClick={() => handleOpenEdit(t)}
                  className="p-2 px-4 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Template</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Template Edit Modal */}
      {activeTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#6D5BFF]" />
                <span>Editing: {editName}</span>
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-xs font-bold text-slate-700 dark:text-gray-200 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewMode ? 'Code View' : 'HTML Preview'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Subject Line</label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
                />
              </div>

              {previewMode ? (
                <div className="p-4 rounded-2xl bg-white text-slate-900 border border-slate-300 min-h-[220px]">
                  <div dangerouslySetInnerHTML={{ __html: editHtml }} />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-400 mb-1">HTML Template Body</label>
                  <textarea
                    rows={8}
                    required
                    value={editHtml}
                    onChange={(e) => setEditHtml(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded text-[#6D5BFF]"
                />
                <label htmlFor="activeToggle" className="font-bold text-slate-300 cursor-pointer">
                  Enable this template for automated dispatch
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTemplate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-800 font-bold hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white font-bold flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Template Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
