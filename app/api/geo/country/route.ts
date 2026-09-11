import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectServerCountryAndCurrency } from '@/lib/geo';

export async function GET(req: NextRequest) {
  try {
    let userId: string | undefined = undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch {
      // Unauthenticated visitor is fine
    }

    const geo = await detectServerCountryAndCurrency(req, userId);

    return NextResponse.json({
      success: true,
      ...geo,
    });
  } catch (err: any) {
    console.error('API Geo Country Error:', err);
    return NextResponse.json({
      success: true,
      isIndia: false,
      countryCode: 'US',
      countryName: 'International',
      currency: 'USD',
      symbol: '$',
      detectedVia: 'fallback',
    });
  }
}
