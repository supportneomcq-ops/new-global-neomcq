'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Layers,
  ArrowLeft,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  CreditCard,
  FileText,
} from 'lucide-react';

export default function AdminSubscriptionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching subscription detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const updateSubscriptionStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change subscription status to "${newStatus}"?`)) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchDetail();
      } else {
        alert(json.error || 'Failed to update subscription status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
        <span>Loading subscription details...</span>
      </div>
    );
  }

  if (!data || !data.subscription) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold space-y-4">
        <div>Subscription record not found.</div>
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscriptions</span>
        </Link>
      </div>
    );
  }

  const { subscription, user, plan, payments, invoices, entitlements } = data;

  return (
    <div className="space-y-6">
      {/* Header Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscriptions</span>
        </Link>

        <div className="flex items-center gap-2">
          {subscription.status === 'active' && (
            <button
              onClick={() => updateSubscriptionStatus('cancelled')}
              disabled={updating}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors text-xs font-bold border border-rose-500/20"
            >
              Cancel Subscription
            </button>
          )}
          {subscription.status !== 'active' && (
            <button
              onClick={() => updateSubscriptionStatus('active')}
              disabled={updating}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors text-xs font-bold border border-emerald-500/20"
            >
              Reactivate Membership
            </button>
          )}
        </div>
      </div>

      {/* Subscription Primary Details */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Subscription Plan</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {subscription.plan_name}
            </div>
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Status: {subscription.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          <div>
            <div className="font-bold text-slate-400">Customer</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1">{subscription.user_name}</div>
            <div className="text-slate-400 text-[10px]">{subscription.user_email}</div>
          </div>

          <div>
            <div className="font-bold text-slate-400">Current Period Start</div>
            <div className="font-bold text-slate-900 dark:text-white mt-1">
              {new Date(subscription.current_period_start || subscription.created_at).toLocaleDateString()}
            </div>
          </div>

          <div>
            <div className="font-bold text-slate-400">Renewal / End Date</div>
            <div className="font-bold text-emerald-500 mt-1">
              {new Date(subscription.current_period_end || Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString()}
            </div>
          </div>

          <div>
            <div className="font-bold text-slate-400">Billing Provider</div>
            <div className="font-extrabold uppercase text-indigo-400 mt-1">{subscription.provider || 'razorpay'}</div>
          </div>
        </div>
      </div>

      {/* Entitlements & Access Rights */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#6D5BFF]" />
          <span>Active Granted User Entitlements</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
          {(entitlements || []).map((ent: string, idx: number) => (
            <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{ent}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
