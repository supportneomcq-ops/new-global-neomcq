'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  DollarSign,
  Tag,
} from 'lucide-react';

export default function AdminPlansPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [priceInr, setPriceInr] = useState('999');
  const [priceUsd, setPriceUsd] = useState('14.99');
  const [interval, setInterval] = useState('monthly');
  const [features, setFeatures] = useState('Adaptive Q-Bank Access\nReal-Time AI Tutor Answers\nPerformance Analytics');

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      const json = await res.json();
      if (json.success) {
        setPlans(json.plans || []);
      }
    } catch (err) {
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setCreating(true);
    try {
      const featureList = features.split('\n').map((f) => f.trim()).filter(Boolean);
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          price_inr: parseFloat(priceInr) || 0,
          price_usd: parseFloat(priceUsd) || 0,
          billing_interval: interval,
          features: featureList,
          is_active: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setName('');
        setSlug('');
        setDescription('');
        loadPlans();
      } else {
        alert(json.error || 'Failed to create plan');
      }
    } catch (err) {
      console.error('Create plan error:', err);
    } finally {
      setCreating(false);
    }
  };

  const autoGenerateSlug = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#6D5BFF]" />
            <span>Subscription Plan Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Define pricing tiers, billing intervals, features, and active plan visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2.5 px-4 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white transition-colors flex items-center gap-2 text-xs font-bold shadow-lg shadow-[#6D5BFF]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-400 font-bold">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
            <span>Loading subscription plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-slate-400 font-bold">
            No plans configured yet.
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">{plan.billing_interval}</span>
                  {plan.is_active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active</span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400">Inactive</span>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white">{plan.name}</h3>
                <p className="text-xs text-slate-400 min-h-[32px]">{plan.description || 'No description provided.'}</p>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">INR Price</div>
                    <div className="text-lg font-black text-emerald-500">₹{plan.price_inr}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">USD Price</div>
                    <div className="text-lg font-black text-indigo-400">${plan.price_usd}</div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Included Features:</div>
                  {(plan.features || []).map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">{plan.subscribers_count || 0} active subscribers</span>
                <Link
                  href={`/admin/plans/${plan.id}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-[#6D5BFF] hover:text-white transition-colors font-bold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create New Subscription Plan</h2>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Annual Ultra Pass"
                  value={name}
                  onChange={(e) => autoGenerateSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Slug</label>
                <input
                  type="text"
                  required
                  placeholder="annual-ultra-pass"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Plan summary..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">INR Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={priceInr}
                    onChange={(e) => setPriceInr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">USD Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Billing Interval</label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="one_time">One-Time</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Included Features (1 per line)</label>
                <textarea
                  rows={3}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-800 font-bold hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white font-bold"
                >
                  {creating ? 'Creating...' : 'Save & Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
