'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Percent,
  DollarSign,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';

export default function AdminCouponsPage() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('50');
  const [currency, setCurrency] = useState('INR');
  const [usageLimit, setUsageLimit] = useState('500');
  const [applicablePlans, setApplicablePlans] = useState('monthly-pro-pass,annual-ultra-pass');

  // Validator test tool state
  const [testCode, setTestCode] = useState('');
  const [testAmount, setTestAmount] = useState('6999');
  const [valResult, setValResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      const json = await res.json();
      if (json.success) {
        setCoupons(json.coupons || []);
      }
    } catch (err) {
      console.error('Error loading coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setCreating(true);
    try {
      const planArr = applicablePlans.split(',').map((p) => p.trim()).filter(Boolean);
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: parseFloat(discountValue) || 0,
          currency,
          usage_limit: parseInt(usageLimit, 10) || 100,
          applicable_plans: planArr,
          is_active: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setCode('');
        loadCoupons();
      } else {
        alert(json.error || 'Failed to create coupon');
      }
    } catch (err) {
      console.error('Create coupon error:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: couponId, is_active: !currentStatus }),
      });
      const json = await res.json();
      if (json.success) {
        loadCoupons();
      }
    } catch (err) {
      console.error('Toggle coupon error:', err);
    }
  };

  const handleTestValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCode.trim()) return;

    setValidating(true);
    setValResult(null);
    try {
      const res = await fetch('/api/admin/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testCode,
          amount: parseFloat(testAmount) || 0,
          currency: 'INR',
        }),
      });
      const json = await res.json();
      setValResult(json);
    } catch (err) {
      console.error('Validate coupon error:', err);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#6D5BFF]" />
            <span>Discount Coupons & Promotional Offers</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Create percentage/fixed discount codes, set usage limits, and test server-side validation.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2.5 px-4 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white transition-colors flex items-center gap-2 text-xs font-bold shadow-lg shadow-[#6D5BFF]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Usage Limit</th>
                <th className="p-4">Used Count</th>
                <th className="p-4">Applicable Plans</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading coupon codes...</span>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    No active or inactive coupon codes.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                      {c.code}
                    </td>
                    <td className="p-4 font-bold text-emerald-500">
                      {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                    </td>
                    <td className="p-4 text-slate-400 font-bold">
                      {c.usage_limit || 'Unlimited'}
                    </td>
                    <td className="p-4 text-slate-900 dark:text-white font-black">
                      {c.used_count || 0}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {(c.applicable_plans || []).join(', ') || 'All Plans'}
                    </td>
                    <td className="p-4">
                      {c.is_active ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20">Inactive</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleCouponStatus(c.id, c.is_active)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 font-bold text-[11px] transition-colors"
                      >
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Server Coupon Validation Tester */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#6D5BFF]" />
          <span>Server-Side Coupon Validation Test Suite</span>
        </h3>

        <form onSubmit={handleTestValidation} className="flex flex-col sm:flex-row items-end gap-3 text-xs">
          <div className="flex-1 w-full">
            <label className="block font-bold text-slate-400 mb-1">Coupon Code</label>
            <input
              type="text"
              required
              placeholder="e.g. LAUNCH50"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="block font-bold text-slate-400 mb-1">Cart Amount (₹)</label>
            <input
              type="number"
              required
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={validating}
            className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold h-10 shrink-0"
          >
            {validating ? 'Validating...' : 'Validate Code'}
          </button>
        </form>

        {valResult && (
          <div className={`p-4 rounded-2xl border text-xs font-bold space-y-1 ${valResult.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
            <div className="text-sm font-black">{valResult.message}</div>
            {valResult.valid && (
              <div>
                Discount Amount: ₹{valResult.discountAmount} | Final Payable Price: ₹{valResult.finalPrice}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create New Coupon Code</h2>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEET2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Value</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Usage Limit</label>
                <input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Applicable Plans (comma separated)</label>
                <input
                  type="text"
                  value={applicablePlans}
                  onChange={(e) => setApplicablePlans(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-mono"
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
                  {creating ? 'Creating...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
