import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';

const defaultTemplates = [
  {
    id: 'tmpl-welcome',
    slug: 'welcome',
    name: 'Welcome & Onboarding Email',
    subject: 'Welcome to NeoMCQ AI — Master Your Medical Exams!',
    body_html: '<h1>Welcome {{first_name}}!</h1><p>Thank you for joining NeoMCQ AI. Your account is ready with 100+ free high-yield clinical MCQs.</p>',
    body_text: 'Welcome {{first_name}}! Thank you for joining NeoMCQ AI.',
    variables: ['first_name', 'email', 'login_url'],
    is_active: true,
    version: 3,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-verify',
    slug: 'email_verification',
    name: 'Email Address Verification',
    subject: 'Verify Your NeoMCQ AI Email Address',
    body_html: '<h2>Verify Your Account</h2><p>Click below to confirm your email: <a href="{{verification_link}}">Verify Email</a></p>',
    body_text: 'Verify Email: {{verification_link}}',
    variables: ['first_name', 'verification_link', 'otp_code'],
    is_active: true,
    version: 2,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-password-reset',
    slug: 'password_reset',
    name: 'Password Reset Request',
    subject: 'Reset Your NeoMCQ AI Password',
    body_html: '<p>Hi {{first_name}}, click here to reset your password: <a href="{{reset_link}}">Reset Password</a></p>',
    body_text: 'Reset link: {{reset_link}}',
    variables: ['first_name', 'reset_link', 'expires_in'],
    is_active: true,
    version: 1,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-subscription',
    slug: 'subscription_confirmation',
    name: 'Subscription Plan Active',
    subject: 'Your NeoMCQ AI Pro Pass is Now Active!',
    body_html: '<h2>Pro Pass Activated</h2><p>Hi {{first_name}}, your {{plan_name}} subscription is active until {{expiry_date}}.</p>',
    body_text: 'Your {{plan_name}} subscription is active until {{expiry_date}}.',
    variables: ['first_name', 'plan_name', 'amount', 'expiry_date'],
    is_active: true,
    version: 4,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-receipt',
    slug: 'payment_receipt',
    name: 'Payment Tax Invoice & Receipt',
    subject: 'Payment Receipt #{{invoice_number}} — NeoMCQ AI',
    body_html: '<p>Payment Receipt for invoice #{{invoice_number}}. Amount: {{amount_paid}} {{currency}}.</p>',
    body_text: 'Payment Receipt #{{invoice_number}}. Amount: {{amount_paid}}.',
    variables: ['first_name', 'invoice_number', 'amount_paid', 'payment_method', 'download_pdf'],
    is_active: true,
    version: 2,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-reminder',
    slug: 'learning_reminder',
    name: 'Daily High-Yield MCQ Streak Reminder',
    subject: 'Don’t Break Your {{streak_days}}-Day Study Streak!',
    body_html: '<p>Hi {{first_name}}, keep your momentum going! Practice today’s 10 high-yield questions.</p>',
    body_text: 'Keep your momentum going! Practice today’s 10 high-yield questions.',
    variables: ['first_name', 'streak_days', 'recommended_subject'],
    is_active: true,
    version: 1,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-support-reply',
    slug: 'support_reply',
    name: 'Customer Support Ticket Reply',
    subject: 'Re: [Ticket #{{ticket_number}}] {{ticket_subject}}',
    body_html: '<p>Hi {{first_name}},</p><p>{{admin_reply}}</p><p>Best regards,<br>NeoMCQ Support Team</p>',
    body_text: 'Hi {{first_name}},\n\n{{admin_reply}}\n\nBest regards,\nNeoMCQ Support Team',
    variables: ['first_name', 'ticket_number', 'ticket_subject', 'admin_reply', 'status'],
    is_active: true,
    version: 3,
    updated_at: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('slug', { ascending: true });

    if (error || !templates || templates.length === 0) {
      return NextResponse.json({ success: true, templates: defaultTemplates });
    }

    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    console.error('Admin GET email templates error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { id, name, subject, body_html, body_text, is_active } = body;

    const supabase = getSupabaseAdmin();

    const { data: updated, error } = await supabase
      .from('email_templates')
      .upsert({
        id: id || `tmpl-${Date.now()}`,
        name,
        subject,
        body_html,
        body_text,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    await logRevenueAuditEvent({
      userId: auth.user?.id || 'admin',
      action: 'UPDATE_EMAIL_TEMPLATE',
      entityType: 'email_templates',
      entityId: id,
      metadata: { name, subject, is_active },
    });

    return NextResponse.json({
      success: true,
      message: 'Email template updated successfully!',
      template: updated || { id, name, subject, body_html, body_text, is_active, updated_at: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error('Admin POST email templates error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
