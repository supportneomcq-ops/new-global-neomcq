'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Bot,
  Sliders,
  Settings,
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit2,
  Check,
  TrendingUp,
  ShieldCheck,
  Calculator,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ModelPricing {
  id: string;
  provider: string;
  model: string;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  active: boolean;
  currency: string;
}

interface TaskRouting {
  id: string;
  task_type: string;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string;
  fallback_model: string;
  max_input_tokens: number;
  max_output_tokens: number;
  reasoning_level: string;
  credit_cost: number;
  enabled: boolean;
}

interface CreditPack {
  id?: string;
  name: string;
  price_usd: number;
  credits: number;
  bonus_credits: number;
  active: boolean;
  display_order: number;
}

interface PlanLimit {
  plan_id: string;
  monthly_credit_grant: number;
  fair_use_allowance: boolean;
  daily_safety_threshold: number;
  subscription_plans: {
    name: string;
    slug: string;
  };
}

interface MarginRules {
  target_margin: number;
  yellow_warning_threshold: number;
  red_danger_threshold: number;
  infrastructure_cost_coefficient: number;
  payment_fee_coefficient: number;
}

interface CostAlert {
  id: string;
  alert_type: string;
  severity: string;
  threshold_value: number;
  current_value: number;
  message: string;
  status: string;
  created_at: string;
}

export default function AIPricingAdminPage() {
  const [activeTab, setActiveTab] = useState('routing');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // DB Data
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [routing, setRouting] = useState<TaskRouting[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimit[]>([]);
  const [marginRules, setMarginRules] = useState<MarginRules>({
    target_margin: 40,
    yellow_warning_threshold: 30,
    red_danger_threshold: 20,
    infrastructure_cost_coefficient: 5,
    payment_fee_coefficient: 3
  });
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // Simulation Form State
  const [simPrice, setSimPrice] = useState('9.99');
  const [simCredits, setSimCredits] = useState('120');
  const [simUsage, setSimUsage] = useState('40');
  const [simInputTokens, setSimInputTokens] = useState('5000');
  const [simOutputTokens, setSimOutputTokens] = useState('1500');
  const [simModelCost, setSimModelCost] = useState({ in: '0.075', out: '0.30' });
  const [simResult, setSimResult] = useState<any>(null);

  // Editing Item helper state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Credit pack creation state
  const [showAddPack, setShowAddPack] = useState(false);
  const [newPack, setNewPack] = useState<CreditPack>({
    name: '',
    price_usd: 5.00,
    credits: 50,
    bonus_credits: 0,
    active: true,
    display_order: 10
  });

  // Admin user adjustment helper
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustCredits, setAdjustCredits] = useState('100');
  const [adjustReason, setAdjustReason] = useState('Promotional credits grant');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-pricing');
      const data = await res.json();
      if (data.success) {
        setPricing(data.pricing);
        setRouting(data.routing);
        setCreditPacks(data.creditPacks);
        setPlanLimits(data.planLimits);
        setMarginRules(data.marginRules);
        setAlerts(data.alerts);
        setRecentEvents(data.recentEvents);
      }
    } catch (err) {
      console.error('Error fetching pricing parameters:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleEditStart = (item: any, type: string) => {
    setEditingId(item.id || item.plan_id);
    setEditFormData({ ...item });
  };

  const handleEditSave = async (type: string) => {
    setSubmitting(true);
    try {
      let action = '';
      let payload = { ...editFormData };

      if (type === 'routing') {
        action = 'update_routing';
      } else if (type === 'pricing') {
        action = 'update_pricing';
      } else if (type === 'plan_limits') {
        action = 'update_plan_limit';
      } else if (type === 'credit_packs') {
        action = 'save_credit_pack';
      }

      const res = await fetch('/api/admin/ai-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await res.json();

      if (data.success) {
        showMessage('success', 'Configuration updated successfully!');
        setEditingId(null);
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to update rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMarginRules = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/ai-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_margin_rules', ...marginRules })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', 'Global margin rules applied!');
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to apply rules');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCreditPack = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/ai-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_credit_pack', ...newPack })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', 'New commercial credit pack added!');
        setShowAddPack(false);
        setNewPack({
          name: '',
          price_usd: 5.00,
          credits: 50,
          bonus_credits: 0,
          active: true,
          display_order: 10
        });
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to add credit pack');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!adjustUserId) {
      showMessage('error', 'Please enter a target User ID');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/ai-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_adjust_credits',
          target_user_id: adjustUserId,
          credits: adjustCredits,
          description: adjustReason
        })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `User credits adjusted successfully! New Balance: ${data.newBalance} credits.`);
        setAdjustUserId('');
        setAdjustCredits('100');
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const runSimulator = async () => {
    try {
      const res = await fetch('/api/admin/ai-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulation_run',
          price: simPrice,
          credits: simCredits,
          expectedUsage: simUsage,
          inputTokens: simInputTokens,
          outputTokens: simOutputTokens,
          inputCost: simModelCost.in,
          outputCost: simModelCost.out,
          infraCoefficient: marginRules.infrastructure_cost_coefficient
        })
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data.simulation);
      }
    } catch (err) {
      console.error('Simulator query failure:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="ai-pricing-root">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="page-title">AI Engine Economics & Pricing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Central authority controlling AI model routing, credits value, gross margins, and abuse safeguards.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
          id="refresh-btn"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Message toast */}
      {message && (
        <div
          className={`p-4 rounded-md flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
          id="toast-message"
        >
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Target Margin Health Alert Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white rounded-full p-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Target Gross Margin</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{marginRules.target_margin}%</h2>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            中央AIコストエンジン targets {marginRules.target_margin}% gross profit margin on AI tasks to sustain platform profitability.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Active Tasks Configured</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{routing.length} Tasks</h2>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Central cost engine manages model fallbacks and credit mapping dynamically for all generated elements.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white rounded-full p-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">System Alerts</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{alerts.filter(a => a.status === 'active').length} Active</h2>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Monitors real-time provider spikes, anomalies, and unlimited subscribers daily safety thresholds.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1" aria-label="Tabs">
          {[
            { id: 'routing', name: 'Task Routing Rules', icon: Sliders },
            { id: 'pricing', name: 'Models & Pricing', icon: Bot },
            { id: 'packs', name: 'Credit Packs ($)', icon: Coins },
            { id: 'plan_limits', name: 'Plan AI Limits', icon: ShieldCheck },
            { id: 'simulator', name: 'Margin Pricing Simulator', icon: Calculator },
            { id: 'ledger_adjust', name: 'Credit Ledger & Manual adjustment', icon: Settings },
            { id: 'alerts', name: 'Margin Alerts & Circuit Breakers', icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditingId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main tab panel */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="ml-3 text-slate-500 text-sm">Querying economic parameters...</span>
          </div>
        ) : (
          <>
            {/* TABS 1: TASK ROUTING RULES */}
            {activeTab === 'routing' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Dynamic Task Model Routing</h3>
                    <p className="text-xs text-slate-500">
                      Determine which model handles each task type and the commercial credit mapping.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Task Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Primary Provider & Model</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fallback Provider & Model</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Token Budget</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Credit Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {routing.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-900">{item.task_type}</td>
                          <td className="px-4 py-3.5 text-sm text-slate-700">
                            {editingId === item.id ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                                  value={editFormData.primary_provider || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, primary_provider: e.target.value })}
                                />
                                <input
                                  type="text"
                                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                                  value={editFormData.primary_model || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, primary_model: e.target.value })}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium">{item.primary_model}</span>
                                <span className="text-xs text-slate-400">{item.primary_provider}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-700">
                            {editingId === item.id ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                                  value={editFormData.fallback_provider || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, fallback_provider: e.target.value })}
                                />
                                <input
                                  type="text"
                                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                                  value={editFormData.fallback_model || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, fallback_model: e.target.value })}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium">{item.fallback_model || 'None'}</span>
                                <span className="text-xs text-slate-400">{item.fallback_provider || 'None'}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {editingId === item.id ? (
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-slate-400">Max In</label>
                                <input
                                  type="number"
                                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                                  value={editFormData.max_input_tokens || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, max_input_tokens: Number(e.target.value) })}
                                />
                                <label className="text-[10px] text-slate-400">Max Out</label>
                                <input
                                  type="number"
                                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded"
                                  value={editFormData.max_output_tokens || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, max_output_tokens: Number(e.target.value) })}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col text-xs space-y-0.5">
                                <span>In: {item.max_input_tokens.toLocaleString()}</span>
                                <span>Out: {item.max_output_tokens.toLocaleString()}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-indigo-600">
                            {editingId === item.id ? (
                              <input
                                type="number"
                                step="0.5"
                                className="w-20 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.credit_cost || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, credit_cost: Number(e.target.value) })}
                              />
                            ) : (
                              <span>{item.credit_cost} credits</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                            {editingId === item.id ? (
                              <select
                                className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                                value={editFormData.enabled ? 'true' : 'false'}
                                onChange={(e) => setEditFormData({ ...editFormData, enabled: e.target.value === 'true' })}
                              >
                                <option value="true">Active</option>
                                <option value="false">Disabled</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  item.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {item.enabled ? 'Active' : 'Disabled'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm">
                            {editingId === item.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={submitting}
                                  onClick={() => handleEditSave('routing')}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditStart(item, 'routing')}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABS 2: MODELS & PRICING */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Provider Model API Pricing</h3>
                  <p className="text-xs text-slate-500">
                    Pricing source records directly used to calculate raw provider COGS (Cost of Goods Sold).
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Provider</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Model Identifier</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Input Cost (per 1M tokens)</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Output Cost (per 1M tokens)</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pricing.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{item.provider}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-mono text-xs">{item.model}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {editingId === item.id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-24 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.input_cost_per_1m || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, input_cost_per_1m: Number(e.target.value) })}
                              />
                            ) : (
                              <span>${item.input_cost_per_1m.toFixed(3)} USD</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {editingId === item.id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-24 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.output_cost_per_1m || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, output_cost_per_1m: Number(e.target.value) })}
                              />
                            ) : (
                              <span>${item.output_cost_per_1m.toFixed(3)} USD</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {editingId === item.id ? (
                              <select
                                className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                                value={editFormData.active ? 'true' : 'false'}
                                onChange={(e) => setEditFormData({ ...editFormData, active: e.target.value === 'true' })}
                              >
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {item.active ? 'Active' : 'Archived'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {editingId === item.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={submitting}
                                  onClick={() => handleEditSave('pricing')}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditStart(item, 'pricing')}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABS 3: CREDIT PACKS */}
            {activeTab === 'packs' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Commercial Credit Packs</h3>
                    <p className="text-xs text-slate-500">
                      Configure credit packs available to users. Standard packs must support $2, $5, $10 and $9.99 AI Pack.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddPack(!showAddPack)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold transition"
                  >
                    <Plus className="h-4 w-4" /> Add Credit Pack
                  </button>
                </div>

                {showAddPack && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-slate-800">Create New Credit Pack</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Pack Name</label>
                        <input
                          type="text"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          placeholder="e.g. Starter Booster"
                          value={newPack.name}
                          onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Price (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={newPack.price_usd}
                          onChange={(e) => setNewPack({ ...newPack, price_usd: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Credits Included</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={newPack.credits}
                          onChange={(e) => setNewPack({ ...newPack, credits: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Bonus Credits</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={newPack.bonus_credits}
                          onChange={(e) => setNewPack({ ...newPack, bonus_credits: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          disabled={submitting || !newPack.name}
                          onClick={handleAddCreditPack}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs disabled:opacity-50 transition"
                        >
                          Save New Pack
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Pack Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Price (USD)</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Base Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Bonus Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {creditPacks.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {editingId === item.id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-24 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.price_usd || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, price_usd: Number(e.target.value) })}
                              />
                            ) : (
                              <span>${Number(item.price_usd).toFixed(2)} USD</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {editingId === item.id ? (
                              <input
                                type="number"
                                className="w-20 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.credits || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, credits: Number(e.target.value) })}
                              />
                            ) : (
                              <span>{item.credits}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {editingId === item.id ? (
                              <input
                                type="number"
                                className="w-20 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.bonus_credits || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, bonus_credits: Number(e.target.value) })}
                              />
                            ) : (
                              <span>{item.bonus_credits}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                            {Number(item.credits) + Number(item.bonus_credits)} credits
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {editingId === item.id ? (
                              <select
                                className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                                value={editFormData.active ? 'true' : 'false'}
                                onChange={(e) => setEditFormData({ ...editFormData, active: e.target.value === 'true' })}
                              >
                                <option value="true">Active</option>
                                <option value="false">Archived</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {item.active ? 'Active' : 'Archived'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {editingId === item.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={submitting}
                                  onClick={() => handleEditSave('credit_packs')}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditStart(item, 'credit_packs')}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABS 4: PLAN AI LIMITS */}
            {activeTab === 'plan_limits' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Subscription Plan limits mapping</h3>
                  <p className="text-xs text-slate-500">
                    Connect standard monthly plans (e.g. $49 and $99 Truly Unlimited) with safety barriers, concurrency caps, and monthly credits.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Subscription Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Monthly Credit Grant</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Truly Unlimited allowance?</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Daily Safety Threshold</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {planLimits.map((item) => (
                        <tr key={item.plan_id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                            {item.subscription_plans?.name || 'Default Plan'}
                            <span className="block text-xs font-mono text-slate-400 mt-0.5">{item.subscription_plans?.slug}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-semibold">
                            {editingId === item.plan_id ? (
                              <input
                                type="number"
                                className="w-24 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.monthly_credit_grant || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, monthly_credit_grant: Number(e.target.value) })}
                              />
                            ) : (
                              <span>{item.monthly_credit_grant} credits</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {editingId === item.plan_id ? (
                              <select
                                className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                                value={editFormData.fair_use_allowance ? 'true' : 'false'}
                                onChange={(e) => setEditFormData({ ...editFormData, fair_use_allowance: e.target.value === 'true' })}
                              >
                                <option value="true">Yes (Truly Unlimited)</option>
                                <option value="false">No (Credit-Based)</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                                  item.fair_use_allowance
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.fair_use_allowance ? 'Truly Unlimited' : 'Standard'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {editingId === item.plan_id ? (
                              <input
                                type="number"
                                className="w-24 text-xs px-2 py-1 border border-slate-300 rounded"
                                value={editFormData.daily_safety_threshold || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, daily_safety_threshold: Number(e.target.value) })}
                              />
                            ) : (
                              <span>{item.daily_safety_threshold} credits / day</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {editingId === item.plan_id ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={submitting}
                                  onClick={() => handleEditSave('plan_limits')}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditStart(item, 'plan_limits')}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABS 5: MARGIN PRICING SIMULATOR */}
            {activeTab === 'simulator' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Commercial Margin pricing Simulator</h3>
                  <p className="text-xs text-slate-500">
                    A mathematically calculated tool to forecast cost and margin structures before tweaking credit packages or subscription tiers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-slate-800">Forecast Parameters</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Retail Pack Price ($)</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={simPrice}
                          onChange={(e) => setSimPrice(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Credits Granted</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={simCredits}
                          onChange={(e) => setSimCredits(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Expected runs</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={simUsage}
                          onChange={(e) => setSimUsage(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Est Input Tokens</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={simInputTokens}
                          onChange={(e) => setSimInputTokens(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Est Output Tokens</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={simOutputTokens}
                          onChange={(e) => setSimOutputTokens(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Model API Costs (per 1M)</p>
                      <div className="grid grid-cols-2 gap-4 mt-1.5">
                        <div>
                          <label className="text-xs font-medium text-slate-500">Input Cost ($)</label>
                          <input
                            type="number"
                            className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                            value={simModelCost.in}
                            onChange={(e) => setSimModelCost({ ...simModelCost, in: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Output Cost ($)</label>
                          <input
                            type="number"
                            className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                            value={simModelCost.out}
                            onChange={(e) => setSimModelCost({ ...simModelCost, out: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={runSimulator}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold transition mt-2"
                    >
                      Calculate Economic Projection
                    </button>
                  </div>

                  {/* Right Results */}
                  <div className="border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">Profitability Forecast Output</h4>
                      <p className="text-xs text-slate-400">Simulated contribution breakdown based on canonical margin metrics.</p>

                      {simResult ? (
                        <div className="space-y-4 mt-5">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border-r pr-4">
                              <p className="text-xs text-slate-400">Total Provider COGS</p>
                              <p className="text-lg font-semibold text-slate-800">${simResult.totalCogs} USD</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Payment Gateways Fees</p>
                              <p className="text-lg font-semibold text-slate-800">${simResult.paymentFee} USD</p>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-slate-500">Net Profit</span>
                              <span className="text-sm font-semibold text-slate-800">${simResult.contribution} USD</span>
                            </div>
                            <div className="flex justify-between items-center mt-1.5">
                              <span className="text-xs font-medium text-slate-500">Gross Margin %</span>
                              <span
                                className={`text-sm font-bold ${
                                  Number(simResult.grossMargin) >= marginRules.target_margin
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {simResult.grossMargin}%
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3 rounded text-[11px] text-slate-600 space-y-1 mt-4">
                            <div className="flex justify-between">
                              <span>Max break-even operations per purchase:</span>
                              <span className="font-bold text-slate-800">{simResult.breakEvenUsage} runs</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost per generation run:</span>
                              <span className="font-bold text-slate-800">${simResult.providerCostPerUsage}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                          <HelpCircle className="h-10 w-10 stroke-1" />
                          <span className="text-xs mt-2">Adjust values on the left and click calculate.</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-5 leading-normal">
                      Note: Forecasting calculations account for payments commission ({marginRules.payment_fee_coefficient}%) and operational hosting overhead ({marginRules.infrastructure_cost_coefficient}%) configured in global rules.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 6: LEDGER & MANUAL ADJUSTMENTS */}
            {activeTab === 'ledger_adjust' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Adjustment tool */}
                  <div className="md:col-span-1 bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Manual Credit Adjustment</h3>
                    <p className="text-xs text-slate-500">
                      Grant or retract credits manually with reason auditing.
                    </p>

                    <div>
                      <label className="text-xs font-medium text-slate-500">Target User UUID</label>
                      <input
                        type="text"
                        className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                        placeholder="e.g. d68a35-..."
                        value={adjustUserId}
                        onChange={(e) => setAdjustUserId(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Adjustment amount</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          placeholder="e.g. 100 or -50"
                          value={adjustCredits}
                          onChange={(e) => setAdjustCredits(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Transaction Type</label>
                        <select
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value="ADMIN_ADJUSTMENT"
                          disabled
                        >
                          <option value="ADMIN_ADJUSTMENT">ADMIN_ADJUSTMENT</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500">Reason / Reference ID</label>
                      <input
                        type="text"
                        className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                        placeholder="e.g. Support ticket reconciliation"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleAdjustCredits}
                      disabled={submitting || !adjustUserId}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold transition disabled:opacity-50"
                    >
                      Process Credit Adjustment
                    </button>
                  </div>

                  {/* Recent Ledger Transactions list */}
                  <div className="md:col-span-2 border border-slate-200 rounded-lg p-5">
                    <h3 className="text-sm font-bold text-slate-800">Recent Real-time cost events</h3>
                    <p className="text-xs text-slate-500">Audit logs of credits consumed per actual request run.</p>

                    <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {recentEvents.length > 0 ? (
                        recentEvents.map((ev: any) => (
                          <div key={ev.id} className="p-3 border border-slate-100 rounded bg-slate-50/50 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">{ev.task_type}</span>
                              <span className="text-[10px] text-slate-400">Model: {ev.model} • Tokens: {Number(ev.input_tokens) + Number(ev.output_tokens)}</span>
                            </div>
                            <div className="text-right flex flex-col">
                              <span className="text-xs font-bold text-rose-600">-{ev.credits_deducted} credits</span>
                              <span className="text-[10px] text-slate-400">COGS: ${Number(ev.actual_provider_cost).toFixed(5)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          No recent cost events logs found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 7: MARGIN ALERTS */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Active Circuit Breakers & Alerts</h3>
                  <p className="text-xs text-slate-500">
                    Rule-based anomaly checks guarding against malicious loops, runaway code, or plan-margin crashes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Global Rules Config */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-slate-800">Margin Threshold Guidelines</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Target Gross Margin (%)</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={marginRules.target_margin}
                          onChange={(e) => setMarginRules({ ...marginRules, target_margin: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Yellow Warning (%)</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={marginRules.yellow_warning_threshold}
                          onChange={(e) => setMarginRules({ ...marginRules, yellow_warning_threshold: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Red Danger (%)</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={marginRules.red_danger_threshold}
                          onChange={(e) => setMarginRules({ ...marginRules, red_danger_threshold: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Infra coefficient (%)</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={marginRules.infrastructure_cost_coefficient}
                          onChange={(e) => setMarginRules({ ...marginRules, infrastructure_cost_coefficient: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Taxes/fee coefficient (%)</label>
                        <input
                          type="number"
                          className="w-full text-xs p-2 border border-slate-300 rounded bg-white mt-1"
                          value={marginRules.payment_fee_coefficient}
                          onChange={(e) => setMarginRules({ ...marginRules, payment_fee_coefficient: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveMarginRules}
                      disabled={submitting}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold transition"
                    >
                      Apply Thresholds
                    </button>
                  </div>

                  {/* Circuit Breaker Log list */}
                  <div className="border border-slate-200 rounded-lg p-5">
                    <h4 className="font-semibold text-sm text-slate-800">Alert Trigger history</h4>
                    <p className="text-xs text-slate-400">Logs from automated threshold circuit breakers.</p>

                    <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto">
                      {alerts.length > 0 ? (
                        alerts.map((al) => (
                          <div
                            key={al.id}
                            className={`p-3 rounded border flex items-start gap-2 text-xs ${
                              al.severity === 'critical'
                                ? 'bg-rose-50 border-rose-100 text-rose-800'
                                : 'bg-amber-50 border-amber-100 text-amber-800'
                            }`}
                          >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold uppercase tracking-wide block">{al.alert_type}</span>
                              <p className="mt-0.5">{al.message}</p>
                              <span className="text-[10px] text-slate-400 block mt-1">
                                Triggered value: {al.current_value}% (Limit: {al.threshold_value}%)
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 text-slate-400 text-xs">
                          No alerts triggered. System operating within safe margin bounds.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
