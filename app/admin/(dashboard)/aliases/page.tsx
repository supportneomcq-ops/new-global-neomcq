'use client';

import React from 'react';
import { Tags, Plus, Search } from 'lucide-react';

export default function AdminAliasesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Tags className="w-6 h-6 text-[#6D5BFF]" />
            <span>Exam Synonyms & Search Aliases</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Map colloquial search queries to standardized exam entities (e.g. &quot;Step 1&quot; &rarr; &quot;USMLE Step 1 &amp; 2 CK&quot;).
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95">
          <Plus className="w-4 h-4" />
          <span>Add Exam Alias Mapping</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="text-xs font-bold text-slate-500">Configured Search Aliases</div>
        <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
          <div className="py-3 flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">&quot;step1&quot;, &quot;usmle step 1&quot;, &quot;step 2&quot;</span>
              <span className="text-slate-400 text-[10px] ml-2">&rarr; mapped to USMLE Step 1 &amp; 2 CK</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Active</span>
          </div>

          <div className="py-3 flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-900 dark:text-white font-mono">&quot;neet&quot;, &quot;neet-pg&quot;, &quot;nbe&quot;</span>
              <span className="text-slate-400 text-[10px] ml-2">&rarr; mapped to NEET PG</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
