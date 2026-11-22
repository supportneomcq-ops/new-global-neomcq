import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession()
    if (!auth.authorized) return auth.response!

    const roles = auth.roleNames || []
    if (!roles.includes('admin') && !roles.includes('super_admin')) {
      return NextResponse.json({ success: false, error: 'Financial administrator permission required.' }, { status: 403 })
    }

    const body = await req.json()
    const reservationId = String(body?.reservationId || '')
    const finalProviderCostUsd = Number(body?.finalProviderCostUsd)
    const finalInfrastructureCostUsd = Number(body?.finalInfrastructureCostUsd ?? 0)
    const reason = String(body?.reason || '').trim()

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId)) {
      return NextResponse.json({ success: false, error: 'A valid reservation ID is required.' }, { status: 400 })
    }
    if (!Number.isFinite(finalProviderCostUsd) || finalProviderCostUsd < 0) {
      return NextResponse.json({ success: false, error: 'Final provider cost must be zero or greater.' }, { status: 400 })
    }
    if (!Number.isFinite(finalInfrastructureCostUsd) || finalInfrastructureCostUsd < 0) {
      return NextResponse.json({ success: false, error: 'Final infrastructure cost must be zero or greater.' }, { status: 400 })
    }
    if (reason.length < 10 || reason.length > 1000) {
      return NextResponse.json({ success: false, error: 'Provide a reconciliation reason between 10 and 1000 characters.' }, { status: 400 })
    }

    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.rpc('resolve_uncertain_platform_ai_budget', {
      p_reservation_id: reservationId,
      p_final_provider_cost_usd: finalProviderCostUsd,
      p_final_infrastructure_cost_usd: finalInfrastructureCostUsd,
      p_reason: reason,
      p_reconciled_by: auth.user.id,
    })

    if (error || !data?.success) {
      console.error('[Admin AI Budget] Reservation reconciliation failed:', error?.message || data)
      return NextResponse.json(
        { success: false, error: 'Reservation could not be reconciled. Verify that it is still marked uncertain.' },
        { status: 409 }
      )
    }

    await logRevenueAuditEvent({
      admin_id: auth.user.id,
      action: 'ai_budget_reservation_reconciled',
      entityType: 'ai_budget_reservation',
      entityId: reservationId,
      metadata: {
        finalProviderCostUsd,
        finalInfrastructureCostUsd,
        reason,
        result: data,
      },
    })

    return NextResponse.json({ success: true, result: data })
  } catch (error: any) {
    console.error('[Admin AI Budget] Reconciliation request failed:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}
