'use client';

import React, { useState, useEffect } from 'react';
import {
  BadgeDollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Filter,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Calendar,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function AdminRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('ALL');

  const [revenueData, setRevenueData] = useState<any>(null);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe,
        plan: planFilter,
        currency: currencyFilter,
        paymentStatus: paymentStatusFilter,
        subscriptionStatus: subscriptionStatusFilter,
      });

      const res = await fetch(`/api/admin/revenue?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRevenueData(json);
      }
    } catch (err) {
      console.error('Error fetching revenue overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, [timeframe, planFilter, currencyFilter, paymentStatusFilter, subscriptionStatusFilter]);

  const metrics = revenueData?.metrics || {
    grossRevenue: 0,
    netRevenue: 0,
    refundAmount: 0,
    successfulPayments: 0,
    failedPayments: 0,
    refundsCount: 0,
    activeSubscriptions: 0,
    newSubscriptions: 0,
    cancelledSubscriptions: 0,
    trialUsers: 0,
    avgTransactionValue: 0,
    revenuePerUser: 0,
    revenuePerSubscriber: 0,
  };

  const charts = revenueData?.charts || {
    revenueOverTime: [],
    revenueByPlan: [],
    revenueByCurrency: [],
    paymentsStatus: [],
    subscriptionTrends: [],
  };

  const COLORS = ['#6D5BFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <BadgeDollarSign className="w-7 h-7 text-[#6D5BFF]" />
            <span>Revenue & Financial Control Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real-time canonical payment tracking, subscription health, revenue metrics, and financial breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRevenue}
            className="p-2.5 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Server-Side Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-wrap items-center gap-3 text-xs font-bold">
        <div className="flex items-center gap-1.5 text-slate-400 mr-2">
          <Filter className="w-4 h-4 text-[#6D5BFF]" />
          <span>Filters:</span>
        </div>

        {/* Timeframe */}
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">7 Days</option>
          <option value="30d">30 Days</option>
          <option value="90d">90 Days</option>
          <option value="this_year">This Year</option>
        </select>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
        >
          <option value="ALL">All Plans</option>
          <option value="monthly-pro-pass">Monthly Pro Pass</option>
          <option value="annual-ultra-pass">Annual Ultra Pass</option>
          <option value="global-lifetime-pass">Global Lifetime Pass</option>
        </select>

        {/* Currency Filter */}
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
        >
          <option value="ALL">All Currencies</option>
          <option value="INR">INR (₹)</option>
          <option value="USD">USD ($)</option>
        </select>

        {/* Payment Status Filter */}
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
        >
          <option value="ALL">All Payment Statuses</option>
          <option value="captured">Captured</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* Subscription Status Filter */}
        <select
          value={subscriptionStatusFilter}
          onChange={(e) => setSubscriptionStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
        >
          <option value="ALL">All Subscription Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</div>
          <div className="text-3xl font-black mt-2 text-emerald-500">₹{metrics.grossRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-1">Total value before refunds</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Revenue</div>
          <div className="text-3xl font-black mt-2 text-indigo-500">₹{metrics.netRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-1">Gross minus ₹{metrics.refundAmount.toLocaleString()} refunds</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Successful Payments</div>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-white">{metrics.successfulPayments}</div>
          <div className="text-[10px] text-rose-500 mt-1">{metrics.failedPayments} failed attempts</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Subscriptions</div>
          <div className="text-3xl font-black mt-2 text-[#6D5BFF]">{metrics.activeSubscriptions}</div>
          <div className="text-[10px] text-emerald-500 mt-1">+{metrics.newSubscriptions} new this period</div>
        </div>
      </div>

      {/* Secondary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Tx Value</div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">₹{metrics.avgTransactionValue}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Revenue / User</div>
          <div className="text-lg font-black text-emerald-500 mt-1">₹{metrics.revenuePerUser}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Revenue / Sub</div>
          <div className="text-lg font-black text-[#6D5BFF] mt-1">₹{metrics.revenuePerSubscriber}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Trial Users</div>
          <div className="text-lg font-black text-amber-500 mt-1">{metrics.trialUsers}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Cancelled Subs</div>
          <div className="text-lg font-black text-rose-500 mt-1">{metrics.cancelledSubscriptions}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Refunds Processed</div>
          <div className="text-lg font-black text-slate-400 mt-1">{metrics.refundsCount}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Over Time Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#6D5BFF]" />
              <span>Revenue Trend Over Time</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Daily Gross Revenue (INR)</span>
          </div>

          <div className="h-64 w-full">
            {charts.revenueOverTime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                No revenue transactions recorded in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueOverTime}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6D5BFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6D5BFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d1a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="gross" stroke="#6D5BFF" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" name="Gross Revenue (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue by Plan Pie Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Revenue by Subscription Plan</span>
          </h3>

          <div className="h-64 w-full">
            {charts.revenueByPlan.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                No plan breakdown data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.revenueByPlan}
                    dataKey="amount"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {charts.revenueByPlan.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d1a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
