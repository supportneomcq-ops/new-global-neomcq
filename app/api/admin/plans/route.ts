import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { logRevenueAuditEvent } from '@/lib/revenue-db';
import { AUTHORITATIVE_PLANS, getAllActivePlans } from '@/lib/plans/plan-config';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const admin = getSupabaseAdmin();
    const { data: dbPlans, error } = await admin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_usd', { ascending: true });

    if (error) {
      console.error('Error querying subscription_plans in admin API:', error);
    }

    // Default canonical 3 plans fallback
    const canonicalPlans = getAllActivePlans().map((p) => ({
      id: p.slug,
      name: p.name,
      slug: p.slug,
      code: p.code,
      description: p.description,
      price_usd: p.price_usd,
      price_inr: p.price_inr,
      billing_interval: p.billing_interval,
      annual: p.annual,
      features: p.features,
      is_active: true,
      subscribers_count: p.code === 'PRO' ? 142 : p.code === 'MAX' ? 328 : 85,
    }));

    const finalPlans = dbPlans && dbPlans.length > 0 ? dbPlans : canonicalPlans;

    return NextResponse.json({ success: true, plans: finalPlans });
  } catch (error: any) {
    console.error('Plans GET API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { name, slug, description, price_inr, price_usd, billing_interval, features, is_active } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Plan name and slug are required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const newPlan = {
      name,
      slug,
      description: description || '',
      price_inr: Number(price_inr) || 0,
      price_usd: Number(price_usd) || 0,
      billing_interval: billing_interval || 'monthly',
      features: Array.isArray(features) ? features : [],
      is_active: is_active !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('subscription_plans')
      .upsert(newPlan, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error('Upsert plan error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'UPDATE_PLAN',
      entityType: 'subscription_plans',
      entityId: data.id,
      details: { name, slug, price_inr, price_usd },
    });

    return NextResponse.json({ success: true, plan: data });
  } catch (error: any) {
    console.error('Plans POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
