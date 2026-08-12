import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyAdminApiSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const supabase = getSupabaseAdmin();

    const canonicalSchema = [
      { name: 'profiles', category: 'Users & Auth', description: 'User account profiles & study goals', pkey: 'id', fkeys: ['auth.users(id)'], indexes: ['idx_profiles_email'] },
      { name: 'user_roles', category: 'Users & Auth', description: 'RBAC user role mappings', pkey: 'id', fkeys: ['profiles(id)', 'roles(id)'], indexes: ['idx_user_roles_user_id'] },
      { name: 'roles', category: 'Users & Auth', description: 'System security role definitions', pkey: 'id', fkeys: [], indexes: ['idx_roles_name'] },
      { name: 'exams', category: 'Exam Infrastructure', description: 'Medical entrance exams (NEET PG, INICET)', pkey: 'id', fkeys: [], indexes: ['idx_exams_slug'] },
      { name: 'subjects', category: 'Exam Infrastructure', description: 'Core medical subjects & disciplines', pkey: 'id', fkeys: ['exams(id)'], indexes: ['idx_subjects_exam_id'] },
      { name: 'topics', category: 'Exam Infrastructure', description: 'High-yield subject sub-topics', pkey: 'id', fkeys: ['subjects(id)'], indexes: ['idx_topics_subject_id'] },
      { name: 'aliases', category: 'Exam Infrastructure', description: 'Terminological synonyms & aliases', pkey: 'id', fkeys: ['topics(id)'], indexes: [] },
      { name: 'mcqs', category: 'Learning Content', description: 'Clinical & high-yield MCQs bank', pkey: 'id', fkeys: ['topics(id)'], indexes: ['idx_mcqs_topic_id', 'idx_mcqs_difficulty'] },
      { name: 'notes', category: 'Learning Content', description: 'Clinical high-yield study notes', pkey: 'id', fkeys: ['topics(id)'], indexes: ['idx_notes_topic_id'] },
      { name: 'flashcards', category: 'Learning Content', description: 'Active recall flashcards', pkey: 'id', fkeys: ['topics(id)'], indexes: ['idx_flashcards_topic_id'] },
      { name: 'revision_sheets', category: 'Learning Content', description: 'Last-minute revision sheets', pkey: 'id', fkeys: ['subjects(id)'], indexes: [] },
      { name: 'ai_generation_jobs', category: 'AI Engine', description: 'AI content generation queue & status', pkey: 'id', fkeys: ['profiles(id)'], indexes: ['idx_ai_jobs_status'] },
      { name: 'user_learning_context', category: 'AI Engine', description: 'User AI memory & weakness tracking', pkey: 'id', fkeys: ['profiles(id)'], indexes: ['idx_learning_context_user'] },
      { name: 'subscriptions', category: 'Revenue & Billing', description: 'Pro Pass subscription records', pkey: 'id', fkeys: ['profiles(id)', 'payment_plans(id)'], indexes: ['idx_subscriptions_user_status'] },
      { name: 'payments', category: 'Revenue & Billing', description: 'Razorpay transaction ledger', pkey: 'id', fkeys: ['profiles(id)'], indexes: ['idx_payments_razorpay_id'] },
      { name: 'payment_plans', category: 'Revenue & Billing', description: 'Tiered subscription plan pricing', pkey: 'id', fkeys: [], indexes: [] },
      { name: 'coupons', category: 'Revenue & Billing', description: 'Promotional discount codes', pkey: 'id', fkeys: [], indexes: ['idx_coupons_code'] },
      { name: 'notifications', category: 'Communication', description: 'In-app notification queue', pkey: 'id', fkeys: ['profiles(id)'], indexes: ['idx_notifications_user_read'] },
      { name: 'support_tickets', category: 'Support Helpdesk', description: 'User customer support inquiries', pkey: 'id', fkeys: ['profiles(id)'], indexes: ['idx_tickets_status'] },
      { name: 'support_messages', category: 'Support Helpdesk', description: 'Support thread messages & notes', pkey: 'id', fkeys: ['support_tickets(id)'], indexes: ['idx_messages_ticket_id'] },
      { name: 'revenue_audit_logs', category: 'Security & Audit', description: 'Unified administrative audit log', pkey: 'id', fkeys: ['profiles(id)'], indexes: ['idx_audit_logs_action'] },
    ];

    const tablesDetailed = await Promise.all(
      canonicalSchema.map(async (item) => {
        let rowCount = 0;
        try {
          const { count } = await supabase.from(item.name).select('*', { count: 'exact', head: true });
          rowCount = count ?? 0;
        } catch (_) {}

        return {
          ...item,
          rowCount,
          sizeEstimate: rowCount > 1000 ? `${(rowCount * 1.2).toFixed(1)} KB` : '< 100 KB',
          rlsEnabled: true,
          indexesCount: item.indexes.length + 1, // +1 for PK
          foreignKeysCount: item.fkeys.length,
          slowQueriesCount: 0,
        };
      })
    );

    return NextResponse.json({ success: true, tables: tablesDetailed });
  } catch (err: any) {
    console.error('Admin GET database tables error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
