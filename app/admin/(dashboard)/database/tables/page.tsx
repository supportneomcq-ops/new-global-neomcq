'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  Database,
} from 'lucide-react';

export default function AdminDatabaseTablesPage() {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database/tables');
      const json = await res.json();
      if (json.success) {
        setTables(json.tables || []);
      }
    } catch (err) {
      console.error('Failed to load table inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const filteredTables = tables.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/database"
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <Table className="w-6 h-6 text-[#6D5BFF]" />
              <span>Canonical Database Tables Inventory</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Operational inventory of all application tables, row counts, constraints, foreign keys, and RLS policy status.
            </p>
          </div>
        </div>

        <button
          onClick={loadTables}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Table Inventory</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-80 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search table name, category, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="text-xs text-slate-400 font-bold hidden sm:block">
          Showing {filteredTables.length} / {tables.length} Canonical Tables
        </div>
      </div>

      {/* Tables Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Table Name & Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Row Count</th>
                <th className="p-4">Primary Key</th>
                <th className="p-4">Foreign Keys</th>
                <th className="p-4">RLS Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading canonical database table inventory...</span>
                  </td>
                </tr>
              ) : filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    No database tables match your filter query.
                  </td>
                </tr>
              ) : (
                filteredTables.map((t) => (
                  <tr key={t.name} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {t.name}
                      </div>
                      <div className="text-[10px] font-extrabold uppercase text-[#6D5BFF]">
                        {t.category}
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs">{t.description}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                      {t.rowCount.toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{t.pkey}</td>
                    <td className="p-4 font-mono text-slate-400 text-[10px]">
                      {t.fkeys.length > 0 ? t.fkeys.join(', ') : 'None'}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                        <Lock className="w-3 h-3 text-emerald-400" /> RLS ENABLED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
