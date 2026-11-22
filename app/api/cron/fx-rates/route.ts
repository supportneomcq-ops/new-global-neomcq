import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

const FX_SOURCE = 'Frankfurter v2 blended daily reference rates'

type FrankfurterRate = {
  base?: string
  quote?: string
  date?: string
  rate?: number
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return json(401, { success: false, error: 'Unauthorized' })
  }

  const admin = getSupabaseAdmin() as any
  const { data: payments, error: paymentsError } = await admin
    .from('payments')
    .select('currency')
    .eq('status', 'captured')
    .neq('currency', 'USD')

  if (paymentsError) {
    console.error('[Platform FX Worker] Could not load captured payment currencies:', paymentsError.message)
    return json(500, { success: false, error: 'Could not load captured payment currencies.' })
  }

  // INR is included because it is the default checkout currency; other captured currencies
  // are discovered from payment records so international sales can be funded safely too.
  const currencies = new Set<string>(['INR'])
  for (const payment of payments || []) {
    const currency = String(payment.currency || '').toUpperCase()
    if (/^[A-Z]{3}$/.test(currency) && currency !== 'USD') currencies.add(currency)
  }

  const results = await Promise.all(Array.from(currencies).map(async (currency) => {
    try {
      const response = await fetch(
        `https://api.frankfurter.dev/v2/rate/${currency.toLowerCase()}/usd`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(12000),
        }
      )

      if (!response.ok) {
        return { currency, success: false, error: `FX provider returned HTTP ${response.status}.` }
      }

      const quote = await response.json() as FrankfurterRate
      const observedAt = String(quote.date || '')
      const rate = Number(quote.rate)
      const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(observedAt)
        && !Number.isNaN(Date.parse(`${observedAt}T00:00:00Z`))
      const ageDays = dateIsValid
        ? (Date.now() - Date.parse(`${observedAt}T00:00:00Z`)) / 86_400_000
        : Number.POSITIVE_INFINITY

      if (
        String(quote.base || '').toUpperCase() !== currency
        || String(quote.quote || '').toUpperCase() !== 'USD'
        || !Number.isFinite(rate)
        || rate <= 0
        || !dateIsValid
        || ageDays < -0.1
        || ageDays > 3.1
      ) {
        return { currency, success: false, error: 'FX quote failed currency, rate, or freshness validation.' }
      }

      const { data, error } = await admin
        .from('platform_fx_rates')
        .upsert({
          base_currency: currency,
          quote_currency: 'USD',
          rate,
          source: FX_SOURCE,
          observed_at: observedAt,
          fetched_at: new Date().toISOString(),
          provider_metadata: quote,
        }, {
          onConflict: 'base_currency,quote_currency,observed_at,source',
        })
        .select('id,rate,observed_at')
        .single()

      if (error) {
        console.error(`[Platform FX Worker] Could not persist ${currency}/USD quote:`, error.message)
        return { currency, success: false, error: 'Could not persist FX quote.' }
      }

      return {
        currency,
        success: true,
        rate: Number(data.rate),
        observedAt: data.observed_at,
        source: FX_SOURCE,
      }
    } catch (error: any) {
      console.error(`[Platform FX Worker] ${currency}/USD quote failed:`, error?.message || error)
      return { currency, success: false, error: 'FX provider request failed.' }
    }
  }))

  const { data: reconciledCount, error: reconcileError } = await admin.rpc('reconcile_platform_profit_allocations_fx')
  if (reconcileError) {
    console.error('[Platform FX Worker] Allocation reconciliation failed:', reconcileError.message)
    return json(500, {
      success: false,
      results,
      error: 'FX rates were saved, but pending allocations could not be reconciled.',
    })
  }

  const succeeded = results.filter((result) => result.success).length
  return json(succeeded > 0 ? 200 : 502, {
    success: succeeded > 0,
    ratesSaved: succeeded,
    currenciesChecked: results.length,
    allocationsReconciled: Number(reconciledCount || 0),
    results,
  })
}
