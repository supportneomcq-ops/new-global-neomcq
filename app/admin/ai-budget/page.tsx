'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

type BudgetData = {
  rule60?: Record<string, any>
  allocation?: Record<string, any>
  fx?: { latestRates?: Array<Record<string, any>>; source?: string }
  reservations?: { recent?: Array<Record<string, any>>; activeCount?: number; uncertainCount?: number; heldBudgetUsd?: number }
  metrics?: Record<string, any>
  recentEvents?: Array<Record<string, any>>
}

function usd(value: unknown) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 }).format(amount)
}

function amount(value: unknown, currency: string) {
  const number = Number(value || 0)
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(number)
  } catch {
    return `${number.toFixed(2)} ${currency}`
  }
}

function ReconcileForm({ reservationId, onDone }: { reservationId: string; onDone: () => void }) {
  const [providerCost, setProviderCost] = useState('')
  const [infrastructureCost, setInfrastructureCost] = useState('0')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
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
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Reconciliation failed.')
      onDone()
    } catch (err: any) {
      setError(err?.message || 'Reconciliation failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="font-semibold text-amber-900">Confirm final provider billing</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          Provider cost (USD)
          <input required min="0" step="0.000001" type="number" value={providerCost} onChange={(e) => setProviderCost(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          Infrastructure cost (USD)
          <input required min="0" step="0.000001" type="number" value={infrastructureCost} onChange={(e) => setInfrastructureCost(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-2 text-sm" />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-medium text-slate-700">
        Reconciliation reason / invoice reference
        <textarea required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-16 rounded border border-slate-300 bg-white px-2 py-2 text-sm" />
      </label>
      {error && <p className="text-red-700">{error}</p>}
      <div>
        <button disabled={saving} type="submit" className="rounded-md bg-amber-700 px-3 py-2 font-semibold text-white disabled:opacity-50">
          {saving ? 'Reconciling…' : 'Reconcile and release held balance'}
        </button>
      </div>
    </form>
  )
}

export default function AdminAIBudgetPage() {
  const [data, setData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/ai-costs?timeframe=30d', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load AI budget.')
      setData(result)
    } catch (err: any) {
      setError(err?.message || 'Could not load AI budget.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const budget = data?.rule60 || {}
  const allocation = data?.allocation || {}
  const reservations = data?.reservations?.recent || []
  const fxRates = data?.fx?.latestRates || []

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">NeoMCQ / Finance controls</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">AI Budget & Revenue Allocation</h1>
          <p className="mt-1 text-sm text-slate-600">Audited 20% owner · 20% operations · 60% AI budget split</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading && !data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading verified financial records…</div>
      ) : data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Funded AI pool (60%)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{usd(budget.aiBudgetAllowanceUsd)}</p>
              <p className="mt-1 text-xs text-slate-500">From captured net collections</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Available after COGS & holds</p>
              <p className={`mt-2 text-2xl font-bold ${Number(budget.remainingAiBudgetUsd || 0) < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{usd(budget.remainingAiBudgetUsd)}</p>
              <p className="mt-1 text-xs text-slate-500">Provider + infrastructure spend deducted</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Actual AI COGS</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{usd(budget.totalActualCogsUsd)}</p>
              <p className="mt-1 text-xs text-slate-500">Provider and infrastructure</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Held reservations</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{usd(budget.reservedBudgetUsd)}</p>
              <p className="mt-1 text-xs text-slate-500">{data.reservations?.activeCount || 0} active · {data.reservations?.uncertainCount || 0} uncertain</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Net revenue allocation</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${budget.budgetHealth === 'Critical' ? 'bg-red-100 text-red-800' : budget.budgetHealth === 'Caution' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{budget.budgetHealth || 'Unknown'}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Owner · 20%</p><p className="mt-1 text-xl font-semibold">{usd(budget.ownerShareUsd)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Operations · 20%</p><p className="mt-1 text-xl font-semibold">{usd(budget.operationsShareUsd)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">AI · 60%</p><p className="mt-1 text-xl font-semibold">{usd(budget.aiBudgetAllowanceUsd)}</p></div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Eligible net revenue: {usd(budget.effectiveRevenueUsd)} · AI cost ratio: {Number(budget.aiCostRatioPercent || 0).toFixed(2)}% · Gross margin after AI COGS: {Number(budget.grossMarginPercent || 0).toFixed(2)}%</p>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">Allocation by currency and status</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs text-slate-500"><tr><th className="py-2">Currency</th><th>Status</th><th>Payments</th><th>Net collected</th><th>Owner</th><th>Operations</th><th>AI budget</th><th>AI USD</th></tr></thead>
                  <tbody>
                    {(allocation.summary || []).map((row: any, index: number) => (
                      <tr key={`${row.currency}-${row.allocation_status}-${index}`} className="border-t border-slate-100">
                        <td className="py-2 font-medium">{row.currency}</td><td>{row.allocation_status}</td><td>{row.payment_count}</td>
                        <td>{amount(row.net_collected_amount, row.currency)}</td><td>{amount(row.owner_profit_amount, row.currency)}</td>
                        <td>{amount(row.operations_amount, row.currency)}</td><td>{amount(row.ai_budget_amount, row.currency)}</td><td>{usd(row.ai_budget_amount_usd)}</td>
                      </tr>
                    ))}
                    {(allocation.summary || []).length === 0 && <tr><td colSpan={8} className="py-4 text-slate-500">No captured payment allocations yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">Pending FX and pending settlement amounts are excluded from the funded AI pool.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900">Reference FX rates</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-xs text-slate-500"><tr><th className="py-2">Pair</th><th>Rate</th><th>Observed</th><th>Source</th></tr></thead>
                  <tbody>
                    {fxRates.map((rate: any, index: number) => (
                      <tr key={`${rate.base_currency}-${rate.quote_currency}-${rate.observed_at}-${index}`} className="border-t border-slate-100">
                        <td className="py-2 font-medium">{rate.base_currency}/{rate.quote_currency}</td><td>{rate.rate}</td><td>{rate.observed_at}</td><td>{rate.source}</td>
                      </tr>
                    ))}
                    {fxRates.length === 0 && <tr><td colSpan={4} className="py-4 text-slate-500">No FX quotes have been stored.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">Daily reference quotes are not the payment processor’s final settlement rate.</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">Active and uncertain reservations</h2>
            <div className="mt-3 space-y-3">
              {reservations.map((reservation: any) => (
                <div key={reservation.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{reservation.task_type} · {reservation.provider || 'Provider pending'}</p>
                      <p className="mt-1 text-xs text-slate-500">{reservation.id} · {reservation.model || 'Model pending'} · {new Date(reservation.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right"><p className="font-semibold">{usd(reservation.reserved_amount_usd)} held</p><p className="text-xs uppercase text-amber-700">{reservation.status}</p></div>
                  </div>
                  {reservation.status === 'uncertain' ? (
                    <ReconcileForm reservationId={reservation.id} onDone={() => { void load() }} />
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Provider request is still reserved. The system will settle it automatically when usage is confirmed.</p>
                  )}
                </div>
              ))}
              {reservations.length === 0 && <p className="py-4 text-sm text-slate-500">No outstanding reservations.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">Recent AI cost events (last 30 days)</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-slate-500"><tr><th className="py-2">Time</th><th>Task</th><th>Provider / model</th><th>Provider cost</th><th>Infrastructure</th><th>Credits</th></tr></thead>
                <tbody>
                  {(data.recentEvents || []).map((event: any) => (
                    <tr key={event.id} className="border-t border-slate-100">
                      <td className="py-2">{new Date(event.created_at).toLocaleString()}</td><td>{event.task_type}</td>
                      <td>{event.provider} / {event.model}</td><td>{usd(event.actual_provider_cost)}</td>
                      <td>{usd(event.ai_infrastructure_cost)}</td><td>{Number(event.credits_deducted || 0)}</td>
                    </tr>
                  ))}
                  {(data.recentEvents || []).length === 0 && <tr><td colSpan={6} className="py-4 text-slate-500">No AI cost events in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  )
}
