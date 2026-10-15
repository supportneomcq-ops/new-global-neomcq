import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface GeoLocationResult {
  isIndia: boolean;
  countryCode: string;
  countryName: string;
  currency: 'INR' | 'USD' | 'EUR';
  symbol: '₹' | '
  detectedVia: 'header' | 'profile' | 'fallback';
}

/**
  * Server-side country and currency detection helper
  */
export async function detectServerCountryAndCurrency(
  req?: NextRequest | Request,
  userId?: string
): Promise<GeoLocationResult> {
  let countryCode = '';
  let detectedVia: 'header' | 'profile' | 'fallback' = 'fallback';

  if (req) {
    const headers = req.headers;
    const headerCountry =
      headers.get('x-vercel-ip-country') ||
      headers.get('cf-ipcountry') ||
      headers.get('x-country') ||
      headers.get('x-appengine-country') ||
      headers.get('x-real-ip-country') ||
      headers.get('cloudfront-viewer-country');

    if (headerCountry) {
      countryCode = headerCountry.toUpperCase();
      detectedVia = 'header';
    } else {
      const acceptLang = headers.get('accept-language') || '';
      if (acceptLang.includes('en-IN') || acceptLang.includes('hi-IN')) {
        countryCode = 'IN';
        detectedVia = 'header';
      }
    }
  }

  // Check user profile if country was not determined by request header or to verify profile country
  if ((!countryCode || countryCode === 'UNKNOWN') && userId) {
    try {
      const admin = getSupabaseAdmin();
      const { data: profile } = await (admin as any)
        .from('profiles')
        .select('id, timezone, phone, countries(iso2, name)')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        if (profile.countries?.iso2) {
          countryCode = profile.countries.iso2.toUpperCase();
          detectedVia = 'profile';
        } else if (profile.timezone && (profile.timezone.includes('Kolkata') || profile.timezone.includes('Asia/Kolkata') || profile.timezone.includes('Calcutta'))) {
          countryCode = 'IN';
          detectedVia = 'profile';
        } else if (profile.phone && profile.phone.startsWith('+91')) {
          countryCode = 'IN';
          detectedVia = 'profile';
        }
      }
    } catch (err) {
      console.warn('[GeoDetection] Failed to check profile country:', err);
    }
  }

  const isIndia = countryCode === 'IN' || countryCode === 'IND' || countryCode === 'INDIA';
  const eurozoneCountries = new Set(['AT','BE','BG','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES','AD','MC','SM','VA','ME','XK']);
  const isEuro = !isIndia && eurozoneCountries.has(countryCode);
  const currency: 'INR' | 'USD' | 'EUR' = isIndia ? 'INR' : isEuro ? 'EUR' : 'USD';

  return {
    isIndia,
    countryCode: isIndia ? 'IN' : countryCode || 'US',
    countryName: isIndia ? 'India' : isEuro ? 'Eurozone' : 'International',
    currency,
    symbol: currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '
}
 | '€';
  detectedVia: 'header' | 'profile' | 'fallback';
}

/**
  * Server-side country and currency detection helper
  */
export async function detectServerCountryAndCurrency(
  req?: NextRequest | Request,
  userId?: string
): Promise<GeoLocationResult> {
  let countryCode = '';
  let detectedVia: 'header' | 'profile' | 'fallback' = 'fallback';

  if (req) {
    const headers = req.headers;
    const headerCountry =
      headers.get('x-vercel-ip-country') ||
      headers.get('cf-ipcountry') ||
      headers.get('x-country') ||
      headers.get('x-appengine-country') ||
      headers.get('x-real-ip-country') ||
      headers.get('cloudfront-viewer-country');

    if (headerCountry) {
      countryCode = headerCountry.toUpperCase();
      detectedVia = 'header';
    } else {
      const acceptLang = headers.get('accept-language') || '';
      if (acceptLang.includes('en-IN') || acceptLang.includes('hi-IN')) {
        countryCode = 'IN';
        detectedVia = 'header';
      }
    }
  }

  // Check user profile if country was not determined by request header or to verify profile country
  if ((!countryCode || countryCode === 'UNKNOWN') && userId) {
    try {
      const admin = getSupabaseAdmin();
      const { data: profile } = await (admin as any)
        .from('profiles')
        .select('id, timezone, phone, countries(iso2, name)')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        if (profile.countries?.iso2) {
          countryCode = profile.countries.iso2.toUpperCase();
          detectedVia = 'profile';
        } else if (profile.timezone && (profile.timezone.includes('Kolkata') || profile.timezone.includes('Asia/Kolkata') || profile.timezone.includes('Calcutta'))) {
          countryCode = 'IN';
          detectedVia = 'profile';
        } else if (profile.phone && profile.phone.startsWith('+91')) {
          countryCode = 'IN';
          detectedVia = 'profile';
        }
      }
    } catch (err) {
      console.warn('[GeoDetection] Failed to check profile country:', err);
    }
  }

  const isIndia = countryCode === 'IN' || countryCode === 'IND' || countryCode === 'INDIA';

  return {
    isIndia,
    countryCode: isIndia ? 'IN' : countryCode || 'US',
    countryName: isIndia ? 'India' : 'International',
    currency: isIndia ? 'INR' : 'USD',
    symbol: isIndia ? '₹' : '$',
    detectedVia,
  };
}
,
    detectedVia,
  };
}
 | '€';
  detectedVia: 'header' | 'profile' | 'fallback';
}

/**
  * Server-side country and currency detection helper
  */
export async function detectServerCountryAndCurrency(
  req?: NextRequest | Request,
  userId?: string
): Promise<GeoLocationResult> {
  let countryCode = '';
  let detectedVia: 'header' | 'profile' | 'fallback' = 'fallback';

  if (req) {
    const headers = req.headers;
    const headerCountry =
      headers.get('x-vercel-ip-country') ||
      headers.get('cf-ipcountry') ||
      headers.get('x-country') ||
      headers.get('x-appengine-country') ||
      headers.get('x-real-ip-country') ||
      headers.get('cloudfront-viewer-country');

    if (headerCountry) {
      countryCode = headerCountry.toUpperCase();
      detectedVia = 'header';
    } else {
      const acceptLang = headers.get('accept-language') || '';
      if (acceptLang.includes('en-IN') || acceptLang.includes('hi-IN')) {
        countryCode = 'IN';
        detectedVia = 'header';
      }
    }
  }

  // Check user profile if country was not determined by request header or to verify profile country
  if ((!countryCode || countryCode === 'UNKNOWN') && userId) {
    try {
      const admin = getSupabaseAdmin();
      const { data: profile } = await (admin as any)
        .from('profiles')
        .select('id, timezone, phone, countries(iso2, name)')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        if (profile.countries?.iso2) {
          countryCode = profile.countries.iso2.toUpperCase();
          detectedVia = 'profile';
        } else if (profile.timezone && (profile.timezone.includes('Kolkata') || profile.timezone.includes('Asia/Kolkata') || profile.timezone.includes('Calcutta'))) {
          countryCode = 'IN';
          detectedVia = 'profile';
        } else if (profile.phone && profile.phone.startsWith('+91')) {
          countryCode = 'IN';
          detectedVia = 'profile';
        }
      }
    } catch (err) {
      console.warn('[GeoDetection] Failed to check profile country:', err);
    }
  }

  const isIndia = countryCode === 'IN' || countryCode === 'IND' || countryCode === 'INDIA';

  return {
    isIndia,
    countryCode: isIndia ? 'IN' : countryCode || 'US',
    countryName: isIndia ? 'India' : 'International',
    currency: isIndia ? 'INR' : 'USD',
    symbol: isIndia ? '₹' : '$',
    detectedVia,
  };
}
