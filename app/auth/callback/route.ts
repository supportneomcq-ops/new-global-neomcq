import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard'
  // Only allow redirects whose parsed origin remains this application.
  let next = '/dashboard'
  try {
    const target = new URL(requestedNext, requestUrl.origin)
    if (target.origin === requestUrl.origin) {
      next = `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    // Keep the safe dashboard fallback for malformed redirect targets.
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Return the user to an error page or homepage with instructions
  return NextResponse.redirect(new URL('/?error=auth_callback_failed', requestUrl.origin))
}
