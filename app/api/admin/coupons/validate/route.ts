import { NextRequest, NextResponse } from 'next/server';
import { validateCouponServerSide } from '@/lib/revenue-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, planId, examId, userId, amount, currency } = body;

    const result = await validateCouponServerSide({
      code,
      planId,
      examId,
      userId,
      amount: Number(amount) || 0,
      currency: currency || 'INR',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Server coupon validation error:', error);
    return NextResponse.json({
      valid: false,
      discountAmount: 0,
      finalPrice: 0,
      message: error.message || 'Validation failed',
    }, { status: 500 });
  }
}
