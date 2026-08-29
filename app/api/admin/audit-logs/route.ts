import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await (supabase as any).rpc('is_admin', { p_user_id: user.id })

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich user profiles
    const userIds = Array.from(new Set((logs || []).map((l: any) => l.user_id).filter(Boolean)))
    const profilesMap = new Map<string, any>()
    if (userIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, auth_user_id, email, first_name, last_name')
          .or(`id.in.(${userIds.join(',')}),auth_user_id.in.(${userIds.join(',')})`)
        ;(profiles || []).forEach((p: any) => {
          if (p.id) profilesMap.set(p.id, p)
          if (p.auth_user_id) profilesMap.set(p.auth_user_id, p)
        })
      } catch (profileErr) {
        console.warn('Profile enrichment warning:', profileErr)
      }
    }

    const enrichedLogs = (logs || []).map((l: any) => ({
      ...l,
      profiles: l.user_id ? profilesMap.get(l.user_id) || null : null,
    }))

    return NextResponse.json({ success: true, logs: enrichedLogs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
