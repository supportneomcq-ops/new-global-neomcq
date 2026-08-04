import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-neo-mcq.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-key'

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
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
  const { data: { user } } = await supabase.auth.getUser()

  const url = new URL(request.url)
  const pathname = url.pathname

  // Check path categories
  const isAuthPage = pathname.startsWith('/auth/sign-in')
  const isDashboardPage = pathname.startsWith('/dashboard')
  const isAdminPage = pathname.startsWith('/admin')
  const isSupportPage = pathname.startsWith('/support')

  const isProtectedRoute = isDashboardPage || isAdminPage || isSupportPage

  if (!user) {
    // Unauthenticated users trying to access protected areas -> redirect to sign in
    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth/sign-in', request.url)
      // Optional: keep track of original destination
      redirectUrl.searchParams.set('redirected_from', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  } else {
    // Authenticated users: retrieve their roles from DB
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)

    const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || []
    
    const isAdmin = roleNames.includes('admin') || roleNames.includes('super_admin')
    const isSupport = roleNames.includes('support')
    const isUser = !isAdmin && !isSupport

    // 1. If trying to access sign-in page, redirect to correct dashboard
    if (isAuthPage) {
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (isSupport) {
        return NextResponse.redirect(new URL('/support', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // 2. Strict route protection based on roles
    if (isDashboardPage && !isUser) {
      // Redirect Admins and Support to their own panels
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      if (isSupport) {
        return NextResponse.redirect(new URL('/support', request.url))
      }
    }

    if (isAdminPage && !isAdmin) {
      // Non-admins trying to access admin route -> redirect based on role
      if (isSupport) {
        return NextResponse.redirect(new URL('/support', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    if (isSupportPage && !isSupport) {
      // Non-support trying to access support route -> redirect based on role
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}
