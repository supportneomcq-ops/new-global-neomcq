'use client';

import React, { useState } from 'react';
import { HelpCircle, Search, Plus, Filter, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function AdminMCQsPage() {
  const [search, setSearch] = useState('');

  const sampleMCQs = [
    { id: 'mcq-1', prompt: 'A 45-year-old male presents with chest pain radiating to left arm...', exam: 'USMLE Step 1', subject: 'Cardiology', difficulty: 'Hard', status: 'Published' },
    { id: 'mcq-2', prompt: 'Which of the following cranial nerves passes through the jugular foramen?', exam: 'USMLE Step 1', subject: 'Anatomy', difficulty: 'Medium', status: 'Published' },
    { id: 'mcq-3', prompt: 'Under Indian Constitution, Article 32 guarantees which right?', exam: 'UPSC CSE', subject: 'Polity', difficulty: 'Medium', status: 'Draft' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#6D5BFF]" />
            <span>MCQs Item Bank</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Manage high-yield clinical vignettes, stems, distractor options, and explanations.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95">
          <Plus className="w-4 h-4" />
          <span>Generate New MCQ Vignette</span>
        </button>
      </div>

      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search MCQ stems, options, or subjects..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter by Exam & Subject</span>
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
            <tr>
              <th className="p-4">Clinical Vignette Stem</th>
              <th className="p-4">Exam</th>
              <th className="p-4">Subject</th>
              <th className="p-4">Difficulty</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
            {sampleMCQs.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                <td className="p-4 max-w-md truncate font-bold text-slate-900 dark:text-white">{q.prompt}</td>
                <td className="p-4 text-slate-600 dark:text-gray-300">{q.exam}</td>
                <td className="p-4 text-slate-600 dark:text-gray-300">{q.subject}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500">
                    {q.difficulty}
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                    {q.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-gray-200">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
