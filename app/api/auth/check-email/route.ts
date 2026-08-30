import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';

const checkEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = checkEmailSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          status: 'invalid',
          available: false,
          message: result.error.errors[0]?.message || 'Enter a valid email address',
        },
        { status: 400 }
      );
    }

    const email = result.data.email;
    const adminClient = getSupabaseAdmin();

    // Check profiles table for existing email
    const { data, error } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking email availability:', error);
      // Fallback safely so user isn't completely blocked by transient errors
      return NextResponse.json({ status: 'unknown', available: true, message: 'Could not verify email' });
    }

    if (data) {
      return NextResponse.json({
        status: 'registered',
        available: false,
        message: 'Email already registered',
      });
    }

    return NextResponse.json({
      status: 'available',
      available: true,
      message: 'Email available',
    });
  } catch (error) {
    console.error('Check email exception:', error);
    return NextResponse.json(
      { status: 'error', available: true, message: 'Error checking email availability' },
      { status: 500 }
    );
  }
}
