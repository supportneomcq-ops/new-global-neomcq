'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Search, Sparkles, RefreshCw, Layers, CheckCircle, Database, Network } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function AdminKnowledgeEnginePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    examsCount: 0,
    subjectsCount: 0,
    topicsCount: 0,
    aliasesCount: 0,
  });
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [{ count: examsCount }, { count: subjectsCount }, { count: topicsCount }, { count: aliasesCount }] = await Promise.all([
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('exam_aliases').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        examsCount: examsCount || 0,
        subjectsCount: subjectsCount || 0,
        topicsCount: topicsCount || 0,
        aliasesCount: aliasesCount || 0,
      });
    } catch (err) {
      console.error('Failed to load knowledge engine stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#6D5BFF]" />
            <span>Knowledge Engine & Entity Recognition</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Canonical medical taxonomy, exam alias mapping, and cross-subject entity graph.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors w-fit"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase">Exams In Knowledge Graph</div>
          <div className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{stats.examsCount}</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase">Medical Subjects</div>
          <div className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{stats.subjectsCount}</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase">Syllabus Topics</div>
          <div className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{stats.topicsCount}</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-slate-400 font-bold uppercase">Mapped Aliases</div>
          <div className="text-2xl font-black mt-2 text-[#6D5BFF]">{stats.aliasesCount}</div>
        </div>
      </div>

      {/* Graph Visualisation Summary */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-heading font-extrabold text-sm">
          <Network className="w-5 h-5 text-[#6D5BFF]" />
          <span>Taxonomy Hierarchy & Semantic Mapping</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-gray-300">Semantic Matching Engine</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">Active</span>
          </div>
          <p className="text-slate-500 dark:text-gray-400 leading-relaxed">
            The Knowledge Engine matches student search queries, prompt inputs, and AI tutor requests against canonical medical entity tables in real time. Fuzzy aliases automatically resolve variants like "NEET PG" to "NEET-PG".
          </p>
        </div>
      </div>
    </div>
  );
}
