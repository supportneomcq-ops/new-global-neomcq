import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserEntitlements } from '@/lib/entitlements/server-entitlements';
import { DEFAULT_FREE_ENTITLEMENTS } from '@/lib/entitlements/entitlements';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: true,
        entitlements: DEFAULT_FREE_ENTITLEMENTS(''),
      });
    }

    const entitlements = await getServerUserEntitlements(user.id);

    return NextResponse.json({
      success: true,
      entitlements,
    });
  } catch (err: any) {
    console.error('Error fetching entitlements:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch entitlements' },
      { status: 500 }
    );
  }
}
