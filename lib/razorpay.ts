import crypto from 'crypto';
import { PlanCode, AUTHORITATIVE_PLANS, getPlanByCode } from '@/lib/plans/plan-config';

export interface RazorpayOrderResult {
  orderId: string;
  subscriptionId?: string;
  amount: number; // in smallest currency unit (e.g., 999 cents = $9.99 USD)
  currency: string;
  keyId: string;
  receipt: string;
  planCode: PlanCode;
  planName: string;
  billingInterval: 'monthly' | 'yearly';
}

export const EXAM_SWITCH_CONFIG = {
  PRICE_USD: 2.00,
  AMOUNT_USD_CENTS: 200, // $2.00 in cents
  CURRENCY_USD: 'USD',
  // INR fallback
  AMOUNT_INR_PAISE: 17500, // ₹175
  CURRENCY_INR: 'INR',
};

/**
 * Creates a server-side verified Razorpay order / subscription for NeoMCQ Paid Plans
 */
export async function createSubscriptionRazorpayOrder(params: {
  userId: string;
  planCode: PlanCode;
  userEmail?: string;
  userName?: string;
  preferredCurrency?: 'USD' | 'INR';
}): Promise<RazorpayOrderResult> {
  const plan = AUTHORITATIVE_PLANS[params.planCode];
  if (!plan) {
    throw new Error(`Invalid plan code: ${params.planCode}`);
  }

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  const currency = params.preferredCurrency === 'INR' ? 'INR' : 'USD';
  const amount = currency === 'INR' ? plan.amount_paise : plan.amount_cents;
  const receipt = `sub_${params.planCode.toLowerCase()}_${params.userId.slice(0, 8)}_${Date.now()}`;

  // If live/test Razorpay API credentials exist, create order via Razorpay API
  if (keyId && keySecret && !keyId.startsWith('mock_')) {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // Check if a recurring Razorpay Subscription Plan ID is configured for this tier
    const envPlanId =
      params.planCode === 'PRO'
        ? process.env.RAZORPAY_PRO_PLAN_ID
        : params.planCode === 'MAX'
        ? process.env.RAZORPAY_MAX_PLAN_ID
        : process.env.RAZORPAY_ELITE_PLAN_ID;

    // If recurring subscription plan ID is available in environment
    if (envPlanId) {
      try {
        const subResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            plan_id: envPlanId,
            total_count: plan.annual ? 5 : 60, // 5 years for annual, 60 months for monthly
            quantity: 1,
            customer_notify: 1,
            notes: {
              type: 'subscription',
              plan_code: params.planCode,
              user_id: params.userId,
              user_email: params.userEmail || '',
            },
          }),
        });

        const subData = await subResponse.json();
        if (subResponse.ok && subData.id) {
          return {
            orderId: subData.id,
            subscriptionId: subData.id,
            amount,
            currency,
            keyId,
            receipt,
            planCode: plan.code,
            planName: plan.name,
            billingInterval: plan.billing_interval,
          };
        }
      } catch (subErr) {
        console.warn('Recurring subscription creation failed, falling back to standard order checkout:', subErr);
      }
    }

    // Fallback to standard verified Razorpay Order
    let response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: {
          type: 'subscription',
          plan_code: params.planCode,
          user_id: params.userId,
          user_email: params.userEmail || '',
          plan_name: plan.name,
          duration_days: plan.duration_days,
          canonical_price_usd: plan.price_usd,
        },
      }),
    });

    let data = await response.json();

    // If Razorpay merchant account rejects USD currency, fallback server-side to INR transaction
    if (!response.ok && currency === 'USD' && data.error?.description?.toLowerCase().includes('currency')) {
      const inrAmount = plan.amount_paise || Math.round(plan.price_usd * 85 * 100);
      response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: inrAmount,
          currency: 'INR',
          receipt,
          notes: {
            type: 'subscription',
            plan_code: params.planCode,
            user_id: params.userId,
            user_email: params.userEmail || '',
            plan_name: plan.name,
            duration_days: plan.duration_days,
            canonical_price_usd: plan.price_usd,
            converted_from_usd: true,
          },
        }),
      });
      data = await response.json();
    }

    if (!response.ok) {
      console.error('Razorpay Order Creation Failed:', data);
      throw new Error(data.error?.description || 'Failed to create payment order with Razorpay.');
    }

    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
      receipt: data.receipt,
      planCode: plan.code,
      planName: plan.name,
      billingInterval: plan.billing_interval,
    };
  }

  // Never return fake checkout IDs in production; they cannot be verified or charged.
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    throw new Error('Razorpay checkout is not configured on this server. Please contact support.');
  }

  // Preview / Development Mode fallback
  const mockOrderId = `order_${params.planCode.toLowerCase()}_${Math.random().toString(36).substring(2, 12)}`;
  return {
    orderId: mockOrderId,
    amount,
    currency,
    keyId: keyId || 'rzp_test_placeholder_key',
    receipt,
    planCode: plan.code,
    planName: plan.name,
    billingInterval: plan.billing_interval,
  };
}

/**
 * Creates a server-side verified Razorpay order for an exam switch ($2.00 USD for Pro/Max)
 */
export async function createExamSwitchRazorpayOrder(params: {
  userId: string;
  fromExamId: string;
  toExamId: string;
  fromExamName: string;
  toExamName: string;
  userEmail?: string;
  preferredCurrency?: 'USD' | 'INR';
}): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  receipt: string;
}> {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  const currency = params.preferredCurrency === 'INR' ? EXAM_SWITCH_CONFIG.CURRENCY_INR : EXAM_SWITCH_CONFIG.CURRENCY_USD;
  const amount = currency === 'INR' ? EXAM_SWITCH_CONFIG.AMOUNT_INR_PAISE : EXAM_SWITCH_CONFIG.AMOUNT_USD_CENTS;
  const receipt = `sw_${params.userId.slice(0, 8)}_${Date.now()}`;

  // If Razorpay live API credentials exist, make official API request
  if (keyId && keySecret && !keyId.startsWith('mock_')) {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: {
          type: 'exam_switch',
          user_id: params.userId,
          from_exam_id: params.fromExamId,
          to_exam_id: params.toExamId,
          from_exam_name: params.fromExamName,
          to_exam_name: params.toExamName,
          user_email: params.userEmail || '',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Razorpay Exam Switch Order Creation Failed:', data);
      throw new Error(data.error?.description || 'Failed to create exam switch order with Razorpay.');
    }

    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
      receipt: data.receipt,
    };
  }

  // Never return fake exam-switch checkout IDs in production; they cannot be verified or charged.
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    throw new Error('Razorpay checkout is not configured on this server. Please contact support.');
  }

  // Fallback for sandboxed preview environments
  const mockOrderId = `order_sw_${Math.random().toString(36).substring(2, 14)}`;
  return {
    orderId: mockOrderId,
    amount,
    currency,
    keyId: keyId || 'rzp_test_placeholder_key',
    receipt,
  };
}

/**
 * Validates Razorpay HMAC SHA256 signature server-side
 */
export function verifyRazorpaySignature(params: {
  orderId?: string;
  subscriptionId?: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }

  try {
    const targetId = params.subscriptionId || params.orderId;
    if (!targetId || !params.paymentId || !params.signature) {
      return false;
    }

    // Razorpay signs orders as order_id|payment_id, but subscriptions as payment_id|subscription_id.
    const signaturePayload = params.subscriptionId
      ? `${params.paymentId}|${params.subscriptionId}`
      : `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    const supplied = Buffer.from(params.signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (supplied.length !== expected.length) return false;
    return crypto.timingSafeEqual(supplied, expected);
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}
