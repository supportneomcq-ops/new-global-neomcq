import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'
import { getSupabaseAdmin } from '@/lib/supabase'

function makeRedirect(target: URL | string, request: NextRequest, supabaseResponse: NextResponse) {
  const targetUrl = typeof target === 'string' ? new URL(target, request.url) : target
  const redirectResponse = NextResponse.redirect(targetUrl)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirectResponse
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 })
    }

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh auth session and get current user
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null })) as any

    const url = new URL(request.url)
    const pathname = url.pathname

    // Check path categories
    const isAdminLoginPage = pathname.startsWith('/admin/login') || pathname.startsWith('/auth/admin-login')
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth/sign-in') || isAdminLoginPage
    const isDashboardPage = pathname.startsWith('/dashboard')
    const isAdminPage = pathname.startsWith('/admin') && !isAdminLoginPage
    const isSupportPage = pathname.startsWith('/support')

    const isProtectedRoute = isDashboardPage || isAdminPage || isSupportPage

    if (!user) {
      // Unauthenticated users trying to access protected areas -> redirect to unified login
      if (isProtectedRoute) {
        const loginTarget = '/login'
        const redirectUrl = new URL(loginTarget, request.url)
        redirectUrl.searchParams.set('redirected_from', pathname)
        return makeRedirect(redirectUrl, request, supabaseResponse)
      }
    } else {
      // Authenticated users: retrieve their roles from DB using admin client to bypass RLS
      let roleNames: string[] = []
      try {
        const adminClient = getSupabaseAdmin()
        const { data: userRoles } = await adminClient
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', user.id)
        roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || []
      } catch (err) {
        console.error('Failed to query user roles in middleware:', err)
      }

      // Admin access is determined only by stored role assignments, never by email address.
      const isAdmin =
        roleNames.includes('admin') ||
        roleNames.includes('super_admin') ||
        roleNames.includes('content_admin')
      const isSupport = roleNames.includes('support')

      // 1. If trying to access sign-in / admin login page while already logged in:
      if (isAuthPage) {
        if (isAdmin) {
          return makeRedirect('/admin', request, supabaseResponse)
        } else if (isSupport) {
          return makeRedirect('/support', request, supabaseResponse)
        } else {
          return makeRedirect('/dashboard', request, supabaseResponse)
        }
      }

      // 2. Strict route protection based on roles
      if (isAdminPage && !isAdmin) {
        if (isSupport) {
          return makeRedirect('/support', request, supabaseResponse)
        } else {
          return makeRedirect('/dashboard', request, supabaseResponse)
        }
      }

      if (isSupportPage && !isSupport && !isAdmin) {
        return makeRedirect('/dashboard', request, supabaseResponse)
      }
    }
  } catch (err) {
    console.error('Middleware updateSession error:', err)
  }

  return supabaseResponse
}
