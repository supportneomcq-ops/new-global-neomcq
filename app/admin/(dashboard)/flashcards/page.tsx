'use client';

import React from 'react';
import { Layers, Search, Plus, Sparkles } from 'lucide-react';

export default function AdminFlashcardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#6D5BFF]" />
            <span>Spaced Repetition Flashcards</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Anki-style active recall cards mapped to exam syllabi and topics.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95">
          <Plus className="w-4 h-4" />
          <span>Batch Generate Deck</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-3">
          <span className="font-bold text-sm">Active Decks Index</span>
          <span className="text-xs text-slate-400">4,280 Total Cards</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Cardiovascular Anki Deck</div>
              <div className="text-[10px] text-slate-400">1,120 cards • USMLE Step 1</div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Active</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Neuroanatomy Micro-deck</div>
              <div className="text-[10px] text-slate-400">850 cards • NEET PG</div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
