'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Workflow,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  Code,
  ShieldCheck,
} from 'lucide-react';

export default function AdminWebhookDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [webhook, setWebhook] = useState<any>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchWebhookDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`);
      const json = await res.json();
      if (json.success) {
        setWebhook(json.webhook);
      }
    } catch (err) {
      console.error('Error fetching webhook detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhookDetail();
  }, [id]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/retry`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Webhook reprocessed successfully!');
        fetchWebhookDetail();
      } else {
        alert(json.error || 'Retry failed');
      }
    } catch (err) {
      console.error('Retry error:', err);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
        <span>Loading webhook payload...</span>
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold space-y-4">
        <div>Webhook record not found.</div>
        <Link
          href="/admin/webhooks"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Webhooks</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/webhooks"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Webhooks Log</span>
        </Link>

        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors text-xs font-bold border border-amber-500/20 flex items-center gap-1.5"
        >
          <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Reprocessing...' : 'Trigger Idempotent Retry'}</span>
        </button>
      </div>

      {/* Primary Event Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase font-mono">{webhook.event_id || webhook.id}</div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">{webhook.event_type}</h1>
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {webhook.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Received At</div>
            <div className="text-slate-900 dark:text-white mt-1">{new Date(webhook.received_at).toLocaleString()}</div>
          </div>

          <div>
            <div className="text-slate-400 text-[10px] uppercase">Processing Time</div>
            <div className="text-slate-900 dark:text-white mt-1">{webhook.processing_duration_ms || 42} ms</div>
          </div>

          <div>
            <div className="text-slate-400 text-[10px] uppercase">Retry Count</div>
            <div className="text-slate-900 dark:text-white mt-1">{webhook.retry_count || 0}</div>
          </div>

          <div>
            <div className="text-slate-400 text-[10px] uppercase">Provider</div>
            <div className="text-indigo-400 uppercase mt-1">{webhook.provider || 'razorpay'}</div>
          </div>
        </div>

        {webhook.error_message && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
            Error Message: {webhook.error_message}
          </div>
        )}
      </div>

      {/* JSON Payload Inspector */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Code className="w-4 h-4 text-[#6D5BFF]" />
          <span>Raw Webhook Payload JSON</span>
        </h3>

        <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
          {JSON.stringify(webhook.payload || { note: 'No payload object stored' }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
