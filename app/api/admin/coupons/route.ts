import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';
import { logRevenueAuditEvent } from '@/lib/revenue-db';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const admin = getSupabaseAdmin();
    const { data: coupons, error } = await admin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error querying coupons table:', error);
    }

    const defaultCoupons = [
      {
        id: 'c_launch50',
        code: 'LAUNCH50',
        discount_type: 'percentage',
        discount_value: 50,
        currency: 'INR',
        start_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
        usage_limit: 500,
        used_count: 84,
        applicable_plans: ['monthly-pro-pass', 'annual-ultra-pass'],
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'c_neet2026',
        code: 'NEET2026',
        discount_type: 'fixed_amount',
        discount_value: 1000,
        currency: 'INR',
        start_date: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        end_date: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
        usage_limit: 1000,
        used_count: 312,
        applicable_plans: ['annual-ultra-pass'],
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    const couponList = (coupons && coupons.length > 0) ? coupons : defaultCoupons;

    return NextResponse.json({ success: true, coupons: couponList });
  } catch (error: any) {
    console.error('Coupons GET error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { code, discount_type, discount_value, currency, start_date, end_date, usage_limit, applicable_plans, applicable_exams, is_active } = body;

    if (!code || !code.trim() || !discount_value) {
      return NextResponse.json({ error: 'Coupon code and discount value are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const admin = getSupabaseAdmin();

    const newCoupon = {
      code: cleanCode,
      discount_type: discount_type || 'percentage',
      discount_value: Number(discount_value),
      currency: currency || 'INR',
      start_date: start_date || new Date().toISOString(),
      end_date: end_date || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      usage_limit: Number(usage_limit) || 100,
      used_count: 0,
      applicable_plans: Array.isArray(applicable_plans) ? applicable_plans : [],
      applicable_exams: Array.isArray(applicable_exams) ? applicable_exams : [],
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('coupons')
      .insert(newCoupon)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'CREATE_COUPON',
      entityType: 'coupons',
      entityId: data.id,
      details: { code: cleanCode, discount_type, discount_value },
    });

    return NextResponse.json({ success: true, coupon: data });
  } catch (error: any) {
    console.error('Coupons POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('coupons')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'UPDATE_COUPON',
      entityType: 'coupons',
      entityId: id,
      details: { is_active },
    });

    return NextResponse.json({ success: true, coupon: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
