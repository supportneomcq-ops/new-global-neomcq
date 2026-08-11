'use client';

import React from 'react';
import { StickyNote, Search, Plus } from 'lucide-react';

export default function AdminNotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-[#6D5BFF]" />
            <span>High-Yield Sticky Notes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Curate core memory hooks, rapid recall points, and clinical buzzwords.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95">
          <Plus className="w-4 h-4" />
          <span>Create High-Yield Note</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
            Microbiology
          </span>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Gram-Positive Cocci Differentiation</h3>
          <p className="text-xs text-slate-600 dark:text-gray-300">
            Catalase positive = Staphylococci. Catalase negative = Streptococci. Coagulase positive = S. aureus.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            Pharmacology
          </span>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">ACE Inhibitors vs ARBs</h3>
          <p className="text-xs text-slate-600 dark:text-gray-300">
            ACEi causes dry cough due to bradykinin buildup. ARBs do not affect bradykinin degradation.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            Pathology
          </span>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reed-Sternberg Cells</h3>
          <p className="text-xs text-slate-600 dark:text-gray-300">
            Pathognomonic for Hodgkin Lymphoma ("owl-eye" appearance with CD15+ and CD30+ markers).
          </p>
        </div>
      </div>
    </div>
  );
}
