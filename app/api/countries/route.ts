import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: countries, error } = await (supabase as any)
      .from('countries')
      .select('id, name, iso2, iso3, phone_code, flag_emoji, currency_code, default_timezone')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      countries: countries || [],
    });
  } catch (error: any) {
    console.error('API Countries Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
