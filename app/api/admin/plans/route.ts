import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { logRevenueAuditEvent } from '@/lib/revenue-db';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const admin = getSupabaseAdmin();
    const { data: plans, error } = await admin
      .from('subscription_plans')
      .select('*')
      .order('price_inr', { ascending: true });

    if (error) {
      console.error('Error querying subscription_plans:', error);
    }

    const defaultPlans = [
      {
        id: 'monthly-pro-pass',
        name: 'Monthly Pro Pass',
        slug: 'monthly-pro-pass',
        description: 'Comprehensive monthly practice pass for medical and tech exams',
        price_inr: 999,
        price_usd: 14.99,
        billing_interval: 'monthly',
        features: [
          'Unlimited Adaptive Q-Bank Access',
          'Real-Time AI Tutor & Step Explanations',
          'Custom Mock Exam Builder',
          'Performance Analytics & Weakness Heatmap',
        ],
        is_active: true,
        subscribers_count: 142,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'annual-ultra-pass',
        name: 'Annual Ultra Pass',
        slug: 'annual-ultra-pass',
        description: 'High-yield annual membership with priority AI generation queue',
        price_inr: 6999,
        price_usd: 99.99,
        billing_interval: 'yearly',
        features: [
          'All Monthly Pro Pass Features',
          'Personalized Daily AI Study Schedule',
          'High-Yield Summary Cheat Sheets',
          'Priority AI Generation Queue',
          'Save 42% Compared to Monthly',
        ],
        is_active: true,
        subscribers_count: 328,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'global-lifetime-pass',
        name: 'Global Lifetime Pass',
        slug: 'global-lifetime-pass',
        description: 'Permanent lifetime access across all global exam tracks',
        price_inr: 14999,
        price_usd: 199.99,
        billing_interval: 'lifetime',
        features: [
          'Lifetime Access to ALL Global Exams',
          'Unlimited AI Q-Bank Refresh & Expansion',
          'Dedicated High-Performance Support',
          'All Future Exam Updates Included',
        ],
        is_active: true,
        subscribers_count: 85,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const planList = (plans && plans.length > 0) ? plans : defaultPlans;

    return NextResponse.json({ success: true, plans: planList });
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
    const { name, slug, description, price_inr, price_usd, billing_interval, features, is_active, exam_scope } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Plan name and slug are required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Check if slug already exists
    const { data: existing } = await admin
      .from('subscription_plans')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A plan with this slug already exists' }, { status: 400 });
    }

    const newPlan = {
      name,
      slug,
      description: description || '',
      price_inr: Number(price_inr) || 0,
      price_usd: Number(price_usd) || 0,
      billing_interval: billing_interval || 'monthly',
      features: Array.isArray(features) ? features : [],
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('subscription_plans')
      .insert(newPlan)
      .select()
      .single();

    if (error) {
      console.error('Insert plan error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'CREATE_PLAN',
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
