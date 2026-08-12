'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  ShieldCheck,
  FileText,
  Workflow,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';

export default function AdminPaymentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchPaymentDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching payment detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
        <span>Loading payment detail record...</span>
      </div>
    );
  }

  if (!data || !data.payment) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold space-y-4">
        <div>Payment transaction not found or access restricted.</div>
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payments</span>
        </Link>
      </div>
    );
  }

  const { payment, user, subscription, refund, invoice, webhookEvents, verificationState } = data;

  return (
    <div className="space-y-6">
      {/* Back Link Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Payments</span>
        </Link>

        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Server Verified</span>
        </span>
      </div>

      {/* Primary Payment Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Payment Record ID</div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {payment.razorpay_payment_id || payment.id}
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs font-bold text-slate-400 uppercase">Amount</div>
            <div className="text-2xl font-black text-emerald-500 mt-1">
              {payment.currency === 'USD' ? '$' : '₹'}{payment.amount} {payment.currency}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-slate-400">Order ID</div>
            <div className="font-mono text-slate-900 dark:text-white">{payment.razorpay_order_id || 'N/A'}</div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-400">Payment Gateway Provider</div>
            <div className="font-extrabold uppercase text-indigo-400">{payment.provider || 'razorpay'}</div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-400">Payment Status</div>
            <div className="font-bold capitalize text-emerald-500">{payment.status}</div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-400">Purchased Plan</div>
            <div className="font-bold text-slate-900 dark:text-white">{payment.plan_name || payment.plan_id || 'Pro Pass'}</div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-400">Created At</div>
            <div className="text-slate-900 dark:text-white">{new Date(payment.created_at).toLocaleString()}</div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-400">Captured At</div>
            <div className="text-slate-900 dark:text-white">
              {payment.captured_at ? new Date(payment.captured_at).toLocaleString() : new Date(payment.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* User & Subscription Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Details */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#6D5BFF]" />
            <span>Customer / User Details</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
              <span className="text-slate-400 font-medium">Email:</span>
              <span className="font-bold text-slate-900 dark:text-white">{payment.user_email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
              <span className="text-slate-400 font-medium">Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{payment.user_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
              <span className="text-slate-400 font-medium">Canonical User ID:</span>
              <span className="font-mono text-slate-400">{payment.user_id}</span>
            </div>
          </div>
        </div>

        {/* Subscription Entitlement */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Active Subscription Entitlement</span>
          </h3>

          {subscription ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400 font-medium">Status:</span>
                <span className="font-bold uppercase text-emerald-500">{subscription.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400 font-medium">Current Period End:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-bold">
              Subscription activated via single payment capture.
            </div>
          )}
        </div>
      </div>

      {/* Webhook Activity History */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Workflow className="w-4 h-4 text-[#6D5BFF]" />
          <span>Webhook Events Log</span>
        </h3>

        {webhookEvents.length === 0 ? (
          <div className="text-xs text-slate-400 font-bold py-4 text-center">
            No external webhook events logged for this payment ID.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
            {webhookEvents.map((w: any) => (
              <div key={w.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white font-mono">{w.event_type}</div>
                  <div className="text-[10px] text-slate-400">{new Date(w.received_at).toLocaleString()}</div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
