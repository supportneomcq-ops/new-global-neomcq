'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  BadgeDollarSign,
  RefreshCw,
  AlertCircle,
  Loader2,
  Cpu,
  Coins,
  ShieldCheck,
  DollarSign,
  FileCode,
} from 'lucide-react';

function formatUsd(value: unknown, digits = 6) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatLocal(value: unknown, currency: string) {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function ReconcileReservationForm({
  reservationId,
  onDone,
}: {
  reservationId: string;
  onDone: () => void;
}) {
  const [providerCost, setProviderCost] = useState('');
  const [infrastructureCost, setInfrastructureCost] = useState('0');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/ai-budget/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          finalProviderCostUsd: Number(providerCost),
          finalInfrastructureCostUsd: Number(infrastructureCost),
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Reservation reconciliation failed.');
      }
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Reservation reconciliation failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
        Confirm final provider billing before releasing the held balance
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="grid gap-1 text-[11px] font-semibold text-slate-300">
          Final provider cost (USD)
          <input
            required
            min="0"
            step="0.000001"
            type="number"
            value={providerCost}
            onChange={(event) => setProviderCost(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-300">
          Final infrastructure cost (USD)
          <input
            required
            min="0"
            step="0.000001"
            type="number"
            value={infrastructureCost}
            onChange={(event) => setInfrastructureCost(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <label className="grid gap-1 text-[11px] font-semibold text-slate-300">
        Reconciliation reason / invoice reference
        <textarea
          required
          minLength={10}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-20 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? 'Reconciling…' : 'Confirm reconciliation'}
        </button>
      </div>
    </form>
  );
}

export default function AdminAICostsPage() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [costData, setCostData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-costs?timeframe=${timeframe}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch AI cost breakdown');
      }
      setCostData(json);
    } catch (err: any) {
      console.error('Error fetching AI costs:', err);
      setError(err.message || 'Failed to calculate AI costs');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    void fetchCosts();
  }, [fetchCosts]);

  const reservations = costData?.reservations?.recent || [];
  const allocations = costData?.allocation?.summary || [];
  const fxRates = costData?.fx?.latestRates || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BadgeDollarSign className="w-7 h-7 text-emerald-400" />
            AI Cost & Revenue Allocation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audited net-revenue split, USD-normalized AI budget, provider COGS and reservation controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={() => void fetchCosts()}
            disabled={loading}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Costs</span>
          </button>
        </div>
      </div>

      {loading && !costData ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Loading audited revenue and AI expenditure…
          </span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 space-y-2 bg-slate-900 border border-rose-500/20 rounded-xl">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : costData ? (
        <div className="space-y-6">
          {costData.rule60 && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Financial allocation rule
                    </span>
                    <h2 className="text-lg font-black text-white">20% Owner / 20% Operations / 60% AI</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    The AI budget is funded only from captured net collections with a verified USD conversion.
                  </p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider border flex items-center gap-1.5 ${
                    costData.rule60.budgetHealth === 'Normal'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : costData.rule60.budgetHealth === 'Caution'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Status: {costData.rule60.budgetHealth}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 text-xs">
                {[
                  ['Eligible net revenue', costData.rule60.effectiveRevenueUsd, 'text-white'],
                  ['Owner · 20%', costData.rule60.ownerShareUsd, 'text-sky-300'],
                  ['Operations · 20%', costData.rule60.operationsShareUsd, 'text-amber-300'],
                  ['AI pool · 60%', costData.rule60.aiBudgetAllowanceUsd, 'text-indigo-300'],
                  ['Actual AI COGS', costData.rule60.totalActualCogsUsd, 'text-emerald-400'],
                  ['Available after holds', costData.rule60.remainingAiBudgetUsd, Number(costData.rule60.remainingAiBudgetUsd) < 0 ? 'text-rose-400' : 'text-white'],
                ].map(([label, value, color]: any) => (
                  <div key={label} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">{label}</span>
                    <span className={`text-lg font-black font-mono mt-1 block ${color}`}>{formatUsd(value)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/60 rounded-lg p-3"><span className="text-slate-500">Provider spend</span><p className="mt-1 font-bold text-white">{formatUsd(costData.rule60.providerCostUsd)}</p></div>
                <div className="bg-slate-950/60 rounded-lg p-3"><span className="text-slate-500">Infrastructure spend</span><p className="mt-1 font-bold text-white">{formatUsd(costData.rule60.infrastructureCostUsd)}</p></div>
                <div className="bg-slate-950/60 rounded-lg p-3"><span className="text-slate-500">Held reservations</span><p className="mt-1 font-bold text-amber-300">{formatUsd(costData.rule60.reservedBudgetUsd)}</p></div>
                <div className="bg-slate-950/60 rounded-lg p-3"><span className="text-slate-500">AI cost / net revenue</span><p className="mt-1 font-bold text-white">{costData.rule60.aiCostRatioPercent}%</p></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Actual COGS by Provider
              </h2>
              <div className="space-y-3">
                {Object.keys(costData.breakdowns?.byProvider || {}).length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl">No provider expenses logged in this period.</p>
                ) : (
                  Object.entries(costData.breakdowns.byProvider).map(([name, value]: [string, any]) => (
                    <div key={name} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{name}</span>
                      <span className="font-mono text-emerald-400 font-bold text-sm">{formatUsd(value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Actual COGS by Task Type
              </h2>
              <div className="space-y-3">
                {Object.keys(costData.breakdowns?.byTask || {}).length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl">No task expenses logged in this period.</p>
                ) : (
                  Object.entries(costData.breakdowns.byTask).map(([name, value]: [string, any]) => (
                    <div key={name} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-indigo-300">{name}</span>
                      <span className="font-mono text-emerald-400 font-bold text-sm">{formatUsd(value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Revenue allocation by currency
              </h2>
              <span className="text-[10px] text-slate-500">Timeframe: {timeframe}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Currency</th><th className="px-3">Status</th><th className="px-3">Payments</th>
                    <th className="px-3">Net collected</th><th className="px-3">Owner 20%</th><th className="px-3">Operations 20%</th>
                    <th className="px-3">AI 60%</th><th className="px-3">AI budget USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allocations.map((row: any, index: number) => (
                    <tr key={`${row.currency}-${row.allocation_status}-${index}`}>
                      <td className="py-3 px-3 font-bold text-white">{row.currency}</td>
                      <td className="px-3">{row.allocation_status}</td>
                      <td className="px-3">{row.payment_count}</td>
                      <td className="px-3">{formatLocal(row.net_collected_amount, row.currency)}</td>
                      <td className="px-3">{formatLocal(row.owner_profit_amount, row.currency)}</td>
                      <td className="px-3">{formatLocal(row.operations_amount, row.currency)}</td>
                      <td className="px-3">{formatLocal(row.ai_budget_amount, row.currency)}</td>
                      <td className="px-3 font-bold text-indigo-300">{formatUsd(row.ai_budget_amount_usd)}</td>
                    </tr>
                  ))}
                  {allocations.length === 0 && (
                    <tr><td colSpan={8} className="py-6 text-center text-slate-500">No payment allocations recorded for this timeframe.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500">Only captured, fee-settled payments with valid FX are included in the funded AI pool. Pending FX and pending settlement are excluded.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-sky-400" />
                Latest reference FX rates
              </h2>
              <div className="space-y-2">
                {fxRates.map((rate: any, index: number) => (
                  <div key={`${rate.base_currency}-${rate.quote_currency}-${rate.observed_at}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950 p-3 text-xs">
                    <span className="font-bold text-white">{rate.base_currency}/{rate.quote_currency}</span>
                    <span className="font-mono text-emerald-300">{rate.rate}</span>
                    <span className="text-slate-500">{rate.observed_at}</span>
                    <span className="text-slate-500">{rate.source}</span>
                  </div>
                ))}
                {fxRates.length === 0 && <p className="text-xs text-slate-500">No FX reference rates stored.</p>}
              </div>
              <p className="text-[10px] text-slate-500">Daily reference quotes are for internal USD budget normalization and may differ from the payment processor’s final settlement rate.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Outstanding reservation controls</h2>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-lg bg-slate-950 px-3 py-2 text-slate-300">Active: {costData.reservations?.activeCount || 0}</span>
                <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-300">Uncertain: {costData.reservations?.uncertainCount || 0}</span>
                <span className="rounded-lg bg-slate-950 px-3 py-2 text-slate-300">Held: {formatUsd(costData.reservations?.heldBudgetUsd)}</span>
              </div>
              <div className="space-y-3">
                {reservations.map((reservation: any) => (
                  <div key={reservation.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white">{reservation.task_type} · {reservation.provider || 'Provider pending'}</p>
                        <p className="mt-1 text-[10px] text-slate-500 break-all">{reservation.id}</p>
                        <p className="text-[10px] text-slate-500">{reservation.model || 'Model pending'} · {new Date(reservation.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-300">{formatUsd(reservation.reserved_amount_usd)}</p>
                        <p className="text-[10px] uppercase text-slate-400">{reservation.status}</p>
                      </div>
                    </div>
                    {reservation.status === 'uncertain' ? (
                      <ReconcileReservationForm reservationId={reservation.id} onDone={() => { void fetchCosts(); }} />
                    ) : (
                      <p className="mt-2 text-[10px] text-slate-500">Reservation remains held until provider usage is settled.</p>
                    )}
                  </div>
                ))}
                {reservations.length === 0 && <p className="text-xs text-slate-500">No outstanding reservations.</p>}
              </div>
            </div>
          </div>

          {costData.recentEvents && costData.recentEvents.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Recent AI generation cost events
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700/60">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th><th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Provider / model</th><th className="py-3 px-4">Tokens (In / Out)</th>
                      <th className="py-3 px-4">Provider COGS</th><th className="py-3 px-4">Infrastructure</th><th className="py-3 px-4">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {costData.recentEvents.map((event: any) => (
                      <tr key={event.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{new Date(event.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-white">{event.task_type}</td>
                        <td className="py-3 px-4 text-indigo-300">{event.provider} ({event.model})</td>
                        <td className="py-3 px-4 text-slate-300">{event.input_tokens} / {event.output_tokens}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">{formatUsd(event.actual_provider_cost)}</td>
                        <td className="py-3 px-4 font-bold text-sky-300">{formatUsd(event.ai_infrastructure_cost)}</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{event.credits_deducted || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
