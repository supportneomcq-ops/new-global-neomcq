'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Layers,
  ArrowLeft,
  RefreshCw,
  Save,
  Trash2,
  DollarSign,
  CheckCircle2,
  Users,
} from 'lucide-react';

export default function AdminPlanDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [plan, setPlan] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceInr, setPriceInr] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [features, setFeatures] = useState('');

  const fetchPlanDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/plans/${id}`);
      const json = await res.json();
      if (json.success && json.plan) {
        const p = json.plan;
        setPlan(p);
        setName(p.name || '');
        setDescription(p.description || '');
        setPriceInr((p.price_inr || 0).toString());
        setPriceUsd((p.price_usd || 0).toString());
        setIsActive(p.is_active !== false);
        setFeatures((p.features || []).join('\n'));
      }
    } catch (err) {
      console.error('Error fetching plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetail();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const featureList = features.split('\n').map((f) => f.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          price_inr: parseFloat(priceInr) || 0,
          price_usd: parseFloat(priceUsd) || 0,
          is_active: isActive,
          features: featureList,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Plan updated successfully!');
        fetchPlanDetail();
      } else {
        alert(json.error || 'Failed to update plan');
      }
    } catch (err) {
      console.error('Update plan error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this plan?')) return;
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        router.push('/admin/plans');
      }
    } catch (err) {
      console.error('Deactivate plan error:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
        <span>Loading plan configuration...</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold space-y-4">
        <div>Subscription plan not found.</div>
        <Link
          href="/admin/plans"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Plans</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/plans"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Plans</span>
        </Link>

        <button
          type="button"
          onClick={handleDeactivate}
          className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors text-xs font-bold border border-rose-500/20 flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Deactivate Plan</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase font-mono">{plan.slug}</div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{plan.name}</h1>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-400 uppercase">Subscribers</div>
            <div className="text-2xl font-black text-[#6D5BFF]">{plan.subscribers_count || 0}</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Plan Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Visibility State</label>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
              >
                <option value="true">Active & Available for Purchase</option>
                <option value="false">Inactive / Hidden</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-400 mb-1">INR Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={priceInr}
                onChange={(e) => setPriceInr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">USD Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1">Features (1 per line)</label>
            <textarea
              rows={4}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white font-bold text-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Plan Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
