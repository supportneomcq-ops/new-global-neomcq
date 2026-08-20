import crypto from 'crypto';

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in smallest unit (e.g. 200 cents = $2.00 USD)
  currency: string;
  keyId: string;
  receipt: string;
}

export const EXAM_SWITCH_CONFIG = {
  PRICE_USD: 2.00,
  AMOUNT_USD_CENTS: 200, // $2.00 in cents
  CURRENCY_USD: 'USD',
  // INR Fallback if international cards are routed in INR
  AMOUNT_INR_PAISE: 17500, // ₹175 (~$2 USD)
  CURRENCY_INR: 'INR',
};

/**
 * Creates a server-side verified Razorpay order for an exam switch
 */
export async function createExamSwitchRazorpayOrder(params: {
  userId: string;
  fromExamId: string;
  toExamId: string;
  fromExamName: string;
  toExamName: string;
  userEmail?: string;
  preferredCurrency?: 'USD' | 'INR';
}): Promise<RazorpayOrderResult> {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  const currency = params.preferredCurrency === 'INR' ? EXAM_SWITCH_CONFIG.CURRENCY_INR : EXAM_SWITCH_CONFIG.CURRENCY_USD;
  const amount = currency === 'INR' ? EXAM_SWITCH_CONFIG.AMOUNT_INR_PAISE : EXAM_SWITCH_CONFIG.AMOUNT_USD_CENTS;
  const receipt = `sw_${params.userId.slice(0, 8)}_${Date.now()}`;

  // If Razorpay live API credentials exist, make official API request to Razorpay
  if (keyId && keySecret && !keyId.startsWith('mock_')) {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
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
      console.error('Razorpay Order Creation Failed:', data);
      throw new Error(data.error?.description || 'Failed to create payment order with Razorpay.');
    }

    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
      receipt: data.receipt,
    };
  }

  // Fallback for sandboxed preview environments without production keys configured
  const mockOrderId = `order_${Math.random().toString(36).substring(2, 14)}`;
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
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  
  // If secret not configured in local preview environment, allow graceful testing verification
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }

  try {
    const text = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(params.signature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}
