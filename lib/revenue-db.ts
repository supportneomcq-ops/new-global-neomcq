import { getSupabaseAdmin } from '@/lib/supabase';

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  amount: number;
  currency: string;
  plan_id?: string;
  plan_name?: string;
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled' | 'completed';
  payment_method?: string;
  provider: string;
  created_at: string;
  captured_at?: string;
  refunded_at?: string;
  refund_id?: string;
  webhook_payload?: any;
  country?: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  plan_id: string;
  plan_name?: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'paused' | 'refunded';
  current_period_start: string;
  current_period_end: string;
  cancellation_date?: string;
  amount: number;
  currency: string;
  payment_status?: string;
  provider: string;
  razorpay_subscription_id?: string;
  created_at: string;
  updated_at: string;
  entitlements?: string[];
}

export interface PlanRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_inr: number;
  price_usd: number;
  billing_interval: 'monthly' | 'yearly' | 'lifetime' | 'one_time';
  features: string[];
  exam_scope?: string[];
  is_active: boolean;
  subscribers_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  currency: string;
  start_date: string;
  end_date: string;
  usage_limit: number;
  used_count: number;
  applicable_plans?: string[];
  applicable_exams?: string[];
  is_active: boolean;
  min_purchase_amount?: number;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  payment_id: string;
  user_id: string;
  user_email?: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'processed' | 'failed' | 'cancelled';
  requested_by: string;
  created_at: string;
  processed_at?: string;
  provider: string;
  razorpay_refund_id?: string;
  error_message?: string;
}

export interface InvoiceRecord {
  id: string;
  user_id: string;
  user_email?: string;
  payment_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: 'issued' | 'paid' | 'due' | 'void';
  issued_at: string;
  due_at?: string;
  paid_at?: string;
  invoice_url?: string;
}

export interface WebhookEventRecord {
  id: string;
  event_id: string;
  provider: string;
  event_type: string;
  status: 'processed' | 'failed' | 'pending' | 'retrying' | 'duplicate_skipped';
  received_at: string;
  processed_at?: string;
  processing_duration_ms?: number;
  retry_count: number;
  error_message?: string;
  payload?: any;
  entity_id?: string;
}

export async function logRevenueAuditEvent(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
}) {
  try {
    const admin = getSupabaseAdmin();
    await admin.from('audit_logs').insert({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      details: params.details,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Audit log write bypass error:', e);
  }
}

export async function validateCouponServerSide(params: {
  code: string;
  planId?: string;
  examId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
}): Promise<{ valid: boolean; discountAmount: number; finalPrice: number; message: string; coupon?: CouponRecord }> {
  const admin = getSupabaseAdmin();
  const { code, planId, examId, amount = 0, currency = 'INR' } = params;

  if (!code || !code.trim()) {
    return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Coupon code is required' };
  }

  const cleanCode = code.trim().toUpperCase();
  const { data: coupon, error } = await admin
    .from('coupons')
    .select('*')
    .eq('code', cleanCode)
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Invalid coupon code' };
  }

  if (!coupon.is_active) {
    return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Coupon is currently inactive' };
  }

  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Coupon offer has not started yet' };
  }

  if (coupon.end_date && new Date(coupon.end_date) < now) {
    return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Coupon code has expired' };
  }

  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Coupon usage limit reached' };
  }

  if (coupon.min_purchase_amount && amount < coupon.min_purchase_amount) {
    return {
      valid: false,
      discountAmount: 0,
      finalPrice: amount,
      message: `Minimum purchase of ${currency} ${coupon.min_purchase_amount} required`,
    };
  }

  if (coupon.applicable_plans && coupon.applicable_plans.length > 0 && planId) {
    if (!coupon.applicable_plans.includes(planId) && !coupon.applicable_plans.includes('ALL')) {
      return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Coupon not applicable for this plan' };
    }
  }

  if (coupon.applicable_exams && coupon.applicable_exams.length > 0 && examId) {
    if (!coupon.applicable_exams.includes(examId) && !coupon.applicable_exams.includes('ALL')) {
      return { valid: false, discountAmount: 0, finalPrice: amount, message: 'Coupon not applicable for this exam' };
    }
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = (amount * coupon.discount_value) / 100;
  } else {
    discount = coupon.discount_value;
  }

  discount = Math.min(discount, amount);
  const finalPrice = Math.max(0, amount - discount);

  return {
    valid: true,
    discountAmount: Number(discount.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2)),
    message: 'Coupon applied successfully!',
    coupon,
  };
}
