'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HardDrive,
  FileCode,
  Search,
  Lock,
} from 'lucide-react';

export default function AdminCloudflareR2Page() {
  const [loading, setLoading] = useState(true);
  const [r2Data, setR2Data] = useState<any>(null);

  const loadR2Stats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/storage/r2');
      const json = await res.json();
      if (json.success) {
        setR2Data(json.r2Data);
      }
    } catch (err) {
      console.error('Failed to load R2 stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadR2Stats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/storage"
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-black flex items-center gap-2">
              <Globe className="w-6 h-6 text-amber-500" />
              <span>Cloudflare R2 Object Storage</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              S3-compatible edge media storage for medical diagrams, high-resolution pathology slides, and video assets.
            </p>
          </div>
        </div>

        <button
          onClick={loadR2Stats}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Ping R2 Connection</span>
        </button>
      </div>

      {/* R2 Connection & Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Connection Status</div>
          <div className="text-lg font-black flex items-center gap-1.5">
            {r2Data?.connected ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> CONNECTED
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> NOT CONFIGURED
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {r2Data?.connected ? 'R2 S3 API Ready' : 'Set R2_ACCOUNT_ID env var'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">R2 Bucket Name</div>
          <div className="text-sm font-black font-mono text-slate-900 dark:text-white truncate">
            {r2Data?.bucket || 'neomcq-r2-media'}
          </div>
          <div className="text-[10px] text-amber-400 font-bold">Cloudflare Global Edge</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total Objects</div>
          <div className="text-2xl font-black text-[#6D5BFF]">
            {loading ? '...' : r2Data?.objectCount?.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Media Assets</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Storage Usage</div>
          <div className="text-2xl font-black text-amber-400">
            {loading ? '...' : r2Data?.storageUsage || '0 GB'}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Zero Egress Fees</div>
        </div>
      </div>

      {/* Recent Uploads List */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-bold text-sm text-slate-900 dark:text-white">
          Recent Cloudflare R2 Edge Uploads
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase">
              <tr>
                <th className="p-4">Filename / Path</th>
                <th className="p-4">File Size</th>
                <th className="p-4">Uploaded At</th>
                <th className="p-4">Edge CDN Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading Cloudflare R2 object store telemetry...</span>
                  </td>
                </tr>
              ) : (r2Data?.recentUploads || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                    No R2 uploads logged recently or credentials not configured.
                  </td>
                </tr>
              ) : (
                (r2Data?.recentUploads || []).map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {item.filename}
                    </td>
                    <td className="p-4 font-mono text-slate-300">{item.size}</td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SYNCED
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
