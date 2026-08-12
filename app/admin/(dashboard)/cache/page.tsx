'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Zap,
  ShieldAlert,
} from 'lucide-react';

export default function AdminCachePage() {
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState<any[]>([]);
  const [targetPath, setTargetPath] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadCacheStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cache');
      const json = await res.json();
      if (json.success) {
        setLayers(json.cacheLayers || []);
      }
    } catch (err) {
      console.error('Failed to load cache stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleInvalidate = async (type: 'path' | 'tag') => {
    if (!targetPath) return;
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetPath, type }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage(`Success: ${json.message}`);
        setTargetPath('');
        loadCacheStats();
      } else {
        setMessage(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#6D5BFF]" />
            <span>Cache Infrastructure & Invalidation</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Next.js App Router Data Cache, Full Route Cache, database buffers, and selective cache revalidation controls.
          </p>
        </div>

        <button
          onClick={loadCacheStats}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Cache Stats</span>
        </button>
      </div>

      {/* Cache Invalidation Control Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#6D5BFF]" />
          <span>Targeted Cache Invalidation Control</span>
        </h3>

        {message && (
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
            {message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="e.g. /admin/exams or mcqs-cache-tag"
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
            className="flex-1 p-3 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleInvalidate('path')}
              disabled={actionLoading || !targetPath}
              className="p-3 px-4 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Invalidate Route Path</span>
            </button>

            <button
              onClick={() => handleInvalidate('tag')}
              disabled={actionLoading || !targetPath}
              className="p-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4 text-amber-400" />
              <span>Invalidate Cache Tag</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cache Layers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
            <span>Loading cache layers...</span>
          </div>
        ) : (
          layers.map((layer) => (
            <div
              key={layer.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {layer.name}
                  </div>
                  <div className="text-[10px] uppercase font-extrabold text-[#6D5BFF]">
                    {layer.type}
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> HEALTHY
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 dark:border-gray-800 text-center font-mono">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-gray-900/60">
                  <div className="text-[10px] text-slate-400 uppercase">Hit Rate</div>
                  <div className="font-bold text-emerald-400 text-sm">{layer.hitRate}</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-gray-900/60">
                  <div className="text-[10px] text-slate-400 uppercase">Miss Rate</div>
                  <div className="font-bold text-amber-400 text-sm">{layer.missRate}</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-gray-900/60">
                  <div className="text-[10px] text-slate-400 uppercase">24h Purges</div>
                  <div className="font-bold text-slate-300 text-sm">{layer.invalidations24h}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
