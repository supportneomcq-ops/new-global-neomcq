'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Printer, Eye, FileText, CheckCircle2 } from 'lucide-react';

export default function AdminRevisionSheetDetail({ id }: { id: string }) {
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printable, setPrintable] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    sheet_type: 'quick_revision',
    status: 'approved',
    summary: '',
    key_points: ['', '', ''],
  });

  useEffect(() => {
    fetchSheet();
  }, [id]);

  async function fetchSheet() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/revision-sheets/${id}`);
      const data = await res.json();
      if (data.success) {
        setSheet(data.revision_sheet);
        setFormData({
          title: data.revision_sheet.title || '',
          sheet_type: data.revision_sheet.sheet_type || 'quick_revision',
          status: data.revision_sheet.status || 'approved',
          summary: data.revision_sheet.content?.summary || '',
          key_points: data.revision_sheet.content?.key_points || ['', '', ''],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/revision-sheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          sheet_type: formData.sheet_type,
          status: formData.status,
          content: {
            summary: formData.summary,
            key_points: formData.key_points,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSheet(data.revision_sheet);
        alert('Revision Sheet saved!');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-xs text-slate-500">Loading Revision Sheet...</div>;
  if (!sheet) return <div className="p-12 text-center text-xs text-slate-500">Revision sheet not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/revision-sheets"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-gray-300 hover:text-[#6D5BFF]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Revision Sheets</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-2xl bg-amber-500/10 text-amber-600 font-extrabold text-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
          <button
            onClick={() => setPrintable(!printable)}
            className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-gray-800 text-slate-700 font-extrabold text-xs flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>{printable ? 'Edit Mode' : 'Printable Layout'}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-2xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Sheet'}</span>
          </button>
        </div>
      </div>

      {!printable ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Revision Sheet Content Editor</h2>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Sheet Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Executive High-Yield Summary</label>
            <textarea
              rows={4}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">High-Yield Bullet Points</label>
            {formData.key_points.map((kp, idx) => (
              <input
                key={idx}
                type="text"
                value={kp}
                onChange={(e) => {
                  const updated = [...formData.key_points];
                  updated[idx] = e.target.value;
                  setFormData({ ...formData, key_points: updated });
                }}
                placeholder={`Point #${idx + 1}`}
                className="w-full mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-medium"
              />
            ))}
          </div>
        </div>
      ) : (
        /* Printable Layout */
        <div className="p-10 bg-white text-slate-900 rounded-3xl border border-slate-300 shadow-lg space-y-6 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#6D5BFF] uppercase">
                NEOMCQ HIGH-YIELD REVISION SHEET
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-1">{formData.title}</h1>
            </div>
            <Printer className="w-8 h-8 text-slate-400 print:hidden" />
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase">1. Core Clinical Overview</h3>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">{formData.summary}</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase">2. Exam Key Fact Checklist</h3>
            <ul className="space-y-2 text-xs font-semibold text-slate-800">
              {formData.key_points.map((kp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded border border-slate-400 shrink-0 mt-0.5" />
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
