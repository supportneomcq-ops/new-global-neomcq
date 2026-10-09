import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { loginSchema } from '@/lib/validations/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const inputEmail = email.toLowerCase().trim();
    const supabase = await createClient();

    // Administrator accounts use the same password-verification flow as every other user.
    // Failed credentials must never create users, reset passwords, or grant roles.
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: inputEmail,
      password,
    });

    if (error || !authData?.user) {
      const errMsg = error?.message || 'Invalid credentials';
      if (
        errMsg.toLowerCase().includes('invalid login credentials') ||
        errMsg.toLowerCase().includes('invalid credentials')
      ) {
        return NextResponse.json(
          { error: 'Invalid login credentials. Please verify your email and password.', code: 'INVALID_CREDENTIALS' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: errMsg, code: 'AUTH_FAILED' },
        { status: 401 }
      );
    }

    const user = authData.user;
    let redirectUrl = '/dashboard';
    let roleNames: string[] = [];

    try {
      const adminClient = getSupabaseAdmin();
      
      // Ensure profile exists
      await adminClient.from('profiles').upsert({
        id: user.id,
        auth_user_id: user.id,
        email: inputEmail,
        first_name: user.user_metadata?.first_name || 'User',
        last_name: user.user_metadata?.last_name || '',
      });

      // Check roles
      const { data: userRoles } = await adminClient
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id);

      roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];


    } catch (roleErr) {
      console.error('Role check warning in login route:', roleErr);
    }

    if (
      roleNames.includes('admin') ||
      roleNames.includes('super_admin') ||
      roleNames.includes('content_admin')
    ) {
      redirectUrl = '/admin';
    } else if (roleNames.includes('support')) {
      redirectUrl = '/support';
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
        roles: roleNames,
      },
      session: authData.session ? {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
      } : null,
    });
  } catch (globalErr: any) {
    console.error('[AUTH_LOGIN_FATAL_ERROR]', globalErr);
    return NextResponse.json(
      { error: globalErr?.message || 'An unexpected error occurred during authentication.' },
      { status: 500 }
    );
  }
}
