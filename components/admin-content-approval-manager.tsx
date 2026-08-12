'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, XCircle, Search, RefreshCw, AlertCircle, Eye } from 'lucide-react';

export default function AdminContentApprovalManager() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [search, assetTypeFilter]);

  async function fetchQueue() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, asset_type: assetTypeFilter });
      const res = await fetch(`/api/admin/content-approval?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQueue(data.pending_items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelect = (item: any) => {
    const exists = selectedItems.find((i) => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'request_revision') => {
    if (selectedItems.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/content-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({ id: i.id, asset_type: i.asset_type })),
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedItems([]);
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#6D5BFF]" />
            <span>Content Quality Approval Queue</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Review pending AI & author-generated learning items prior to student release.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queue statement..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Pending Types</option>
            <option value="mcq">MCQs</option>
            <option value="note">Notes</option>
            <option value="flashcard">Flashcards</option>
            <option value="revision_sheet">Revision Sheets</option>
            <option value="ai_tutor_lesson">AI Tutor Lessons</option>
          </select>

          <button onClick={fetchQueue} className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
          <span>{selectedItems.length} items selected for approval review</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('approve')}
              disabled={processing}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white font-extrabold hover:bg-emerald-600 shadow-sm"
            >
              Approve All Selected
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={processing}
              className="px-4 py-1.5 rounded-xl bg-rose-500 text-white font-extrabold hover:bg-rose-600 shadow-sm"
            >
              Reject All Selected
            </button>
          </div>
        </div>
      )}

      {/* Queue Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading Pending Queue...</div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-800 dark:text-white">Approval Queue is Empty!</p>
            <p className="text-[11px] text-slate-400">All submitted learning content has been reviewed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4 w-10">Select</th>
                  <th className="p-4">Asset Type</th>
                  <th className="p-4">Title / Stem</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {queue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={!!selectedItems.find((i) => i.id === item.id)}
                        onChange={() => toggleSelect(item)}
                      />
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-500/10 text-amber-600">
                        {item.asset_label}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white max-w-sm line-clamp-1">
                      {item.title}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">{item.exam_name}</td>
                    <td className="p-4 text-right">
                      <Link
                        href={item.edit_url}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] hover:bg-[#6D5BFF]/20"
                      >
                        Review Item &rarr;
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
