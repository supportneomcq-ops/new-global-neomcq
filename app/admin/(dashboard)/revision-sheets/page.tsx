'use client';

import React from 'react';
import { Sparkles, FileText, Download, Plus } from 'lucide-react';

export default function AdminRevisionSheetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#6D5BFF]" />
            <span>Revision Sheets & High-Yield Summaries</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            One-page rapid revision cheat sheets and AI-synthesized subject summaries.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95">
          <Plus className="w-4 h-4" />
          <span>Publish New Revision Sheet</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-3">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <FileText className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">PDF Ready</span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Coronary Circulation & Myocardial Infarction Sheet</h3>
          <p className="text-xs text-slate-500">Includes ECG findings, vessel localization, and first-line treatment algorithm.</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-3">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <FileText className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">PDF Ready</span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Autonomic Nervous System Receptors Cheat Sheet</h3>
          <p className="text-xs text-slate-500">Alpha-1, Alpha-2, Beta-1, Beta-2 agonists, antagonists, and organ effects.</p>
        </div>
      </div>
    </div>
  );
}
