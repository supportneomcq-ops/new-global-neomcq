import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

async function checkIsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const adminClient = getSupabaseAdmin();
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  const userEmail = user.email?.toLowerCase().trim() || '';
  const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'support@neomcq.com').toLowerCase().trim();
  const isAdminEmail = userEmail === initialAdminEmail || userEmail === 'swapnilsonawane913@gmail.com';

  if (!isAdminEmail && !roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

// GET: AI Operational Audit Logs
export async function GET(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('audit_logs')
      .select('*, profiles(email)', { count: 'exact' })
      .or('action.ilike.AI_%,action.ilike.JOB_%,entity_type.ilike.%ai%');

    if (search) {
      query = query.or(`action.ilike.%${search}%,entity_id.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    // Sanitize logs to strip any potential sensitive credentials
    const sanitizedLogs = (logs || []).map((l: any) => {
      const details = l.details || {};
      const cleanDetails = { ...details };
      delete cleanDetails.apiKey;
      delete cleanDetails.secret;
      delete cleanDetails.token;
      delete cleanDetails.authorization;

      return {
        id: l.id,
        timestamp: l.created_at,
        action: l.action,
        entity_type: l.entity_type,
        job_id: l.entity_id,
        actor: l.profiles?.email || l.user_id || 'System Worker',
        provider: cleanDetails.provider || 'Gemini',
        model: cleanDetails.model || 'gemini-3.5-flash',
        operation: l.action.replace('AI_', '').replace(/_/g, ' '),
        details: cleanDetails,
        ip_address: l.ip_address || 'Internal RPC',
      };
    });

    return NextResponse.json({
      success: true,
      logs: sanitizedLogs,
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
