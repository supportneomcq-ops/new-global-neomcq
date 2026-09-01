import { getSupabaseAdmin } from '@/lib/supabase';
import { UserEntitlements, deriveEntitlements, DEFAULT_FREE_ENTITLEMENTS } from './entitlements';

/**
 * Server-side helper to fetch authoritative entitlements for a given user ID
 */
export async function getServerUserEntitlements(userId: string): Promise<UserEntitlements> {
  if (!userId) {
    return DEFAULT_FREE_ENTITLEMENTS('');
  }

  try {
    const admin = getSupabaseAdmin();

    // Query active subscription from database
    const { data: sub, error } = await admin
      .from('subscriptions')
      .select('id, user_id, plan_id, plan_code, status, current_period_start, current_period_end, cancel_at_period_end, updated_at')
      .eq('user_id', userId)
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription for user entitlements:', error);
    }

    if (!sub) {
      return DEFAULT_FREE_ENTITLEMENTS(userId);
    }

    let planCode = sub.plan_code;

    // If legacy plan_id foreign key was stored instead of plan_code, resolve it
    if (!planCode && sub.plan_id) {
      const { data: planRow } = await admin
        .from('subscription_plans')
        .select('slug, name')
        .eq('id', sub.plan_id)
        .maybeSingle();

      if (planRow) {
        if (planRow.slug?.includes('elite')) planCode = 'ELITE';
        else if (planRow.slug?.includes('max')) planCode = 'MAX';
        else if (planRow.slug?.includes('pro')) planCode = 'PRO';
      }
    }

    return deriveEntitlements(userId, {
      plan_code: planCode,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
    });
  } catch (err) {
    console.error('Unexpected error fetching user entitlements:', err);
    return DEFAULT_FREE_ENTITLEMENTS(userId);
  }
}
