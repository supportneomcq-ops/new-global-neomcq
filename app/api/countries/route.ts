import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GLOBAL_COUNTRIES } from '@/lib/data/countries';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: dbCountries } = await (supabase as any)
      .from('countries')
      .select('id, name, iso2, iso3, phone_code, flag_emoji, currency_code, default_timezone')
      .eq('is_active', true)
      .order('name', { ascending: true });

    const dbMap = new Map<string, any>();
    if (dbCountries && Array.isArray(dbCountries)) {
      for (const c of dbCountries) {
        if (c.iso2) dbMap.set(c.iso2.toUpperCase(), c);
        if (c.name) dbMap.set(c.name.toLowerCase(), c);
      }
    }

    const mergedList = GLOBAL_COUNTRIES.map((c) => {
      const dbMatch = dbMap.get(c.iso2.toUpperCase()) || dbMap.get(c.name.toLowerCase());
      return {
        id: dbMatch?.id || `country-${c.iso2.toLowerCase()}`,
        name: c.name,
        iso2: c.iso2,
        iso3: c.iso3,
        phone_code: c.phone_code,
        flag_emoji: c.flag_emoji,
        currency_code: c.currency_code,
        default_timezone: c.default_timezone,
      };
    });

    return NextResponse.json({
      success: true,
      total: mergedList.length,
      countries: mergedList,
    });
  } catch (error: any) {
    console.error('API Countries Error:', error);
    // Return standard global list fallback
    return NextResponse.json({
      success: true,
      total: GLOBAL_COUNTRIES.length,
      countries: GLOBAL_COUNTRIES.map((c) => ({
        id: `country-${c.iso2.toLowerCase()}`,
        ...c,
      })),
    });
  }
}

