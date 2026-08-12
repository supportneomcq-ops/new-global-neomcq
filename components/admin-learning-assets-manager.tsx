'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  HelpCircle,
  StickyNote,
  BookOpen,
  Brain,
  FileText,
} from 'lucide-react';

export default function AdminLearningAssetsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [search, assetTypeFilter, examFilter]);

  async function fetchExams() {
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAssets() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        asset_type: assetTypeFilter,
        exam_id: examFilter,
      });
      const res = await fetch(`/api/admin/learning-assets?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#6D5BFF]" />
            <span>Unified Learning Assets Inventory</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Cross-format central inventory of all MCQs, Notes, Flashcards, Revision Sheets, and AI Tutor modules.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">MCQs</span>
          <p className="text-xl font-black text-indigo-500 mt-0.5">{stats.mcqs || 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Notes</span>
          <p className="text-xl font-black text-purple-500 mt-0.5">{stats.notes || 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Flashcards</span>
          <p className="text-xl font-black text-emerald-500 mt-0.5">{stats.flashcards || 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Revision Sheets</span>
          <p className="text-xl font-black text-amber-500 mt-0.5">{stats.revisionSheets || 0}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">AI Lessons</span>
          <p className="text-xl font-black text-rose-500 mt-0.5">{stats.aiTutorLessons || 0}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Global search across all learning assets..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Asset Types</option>
            <option value="mcq">MCQs</option>
            <option value="note">Notes</option>
            <option value="flashcard">Flashcards</option>
            <option value="revision_sheet">Revision Sheets</option>
          </select>

          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <button onClick={fetchAssets} className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading Inventory...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No learning assets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Format</th>
                  <th className="p-4">Title / Prompt</th>
                  <th className="p-4">Exam & Subject</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-[#6D5BFF]/10 text-[#6D5BFF]">
                        {item.asset_type}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">
                      <p className="font-bold">{item.exam_name}</p>
                      <p className="text-[10px] text-slate-400">{item.subject_name}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={item.edit_url}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20"
                      >
                        Edit Asset
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
