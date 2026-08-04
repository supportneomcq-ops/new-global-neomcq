import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email('Valid email address required'),
  type: z.enum(['signup', 'email_change']).default('signup'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = resendSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const { email, type } = validation.data
    const supabase = await createClient()

    const { error } = await supabase.auth.resend({
      type,
      email,
      options: {
        emailRedirectTo: `${req.nextUrl.origin}/auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email resent successfully.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to resend email' }, { status: 500 })
  }
}
