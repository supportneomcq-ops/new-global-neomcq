import pg from 'pg';
const { Client } = pg;

async function runMigration() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    console.error('POSTGRES_URL environment variable is missing.');
    process.exit(1);
  }

  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

  console.log('[Migration Phase 5B] Connecting to PostgreSQL database...');
  await client.connect();

  try {
    console.log('[Migration Phase 5B] Creating ai_tutor_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.ai_tutor_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id UUID NOT NULL REFERENCES public.ai_tutor_lessons(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        topic_id UUID REFERENCES public.exam_topics(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        is_faq_candidate BOOLEAN DEFAULT false,
        faq_id UUID,
        credits_deducted NUMERIC(10, 4) DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_lesson ON public.ai_tutor_messages(lesson_id);
      CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_user ON public.ai_tutor_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_topic ON public.ai_tutor_messages(topic_id);

      ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users view own tutor messages" ON public.ai_tutor_messages;
      CREATE POLICY "Users view own tutor messages" ON public.ai_tutor_messages
        FOR SELECT USING (auth.uid() = user_id OR user_id = auth.uid());

      DROP POLICY IF EXISTS "Users insert own tutor messages" ON public.ai_tutor_messages;
      CREATE POLICY "Users insert own tutor messages" ON public.ai_tutor_messages
        FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = auth.uid());
    `);

    console.log('[Migration Phase 5B] Creating ai_tutor_faqs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.ai_tutor_faqs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES public.exam_topics(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        question_normalized TEXT NOT NULL,
        answer TEXT NOT NULL,
        source_message_id UUID,
        use_count INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_tutor_faqs_topic ON public.ai_tutor_faqs(topic_id);
      CREATE INDEX IF NOT EXISTS idx_ai_tutor_faqs_normalized ON public.ai_tutor_faqs(topic_id, question_normalized);

      ALTER TABLE public.ai_tutor_faqs ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Anyone read FAQs" ON public.ai_tutor_faqs;
      CREATE POLICY "Anyone read FAQs" ON public.ai_tutor_faqs
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Authenticated write FAQs" ON public.ai_tutor_faqs;
      CREATE POLICY "Authenticated write FAQs" ON public.ai_tutor_faqs
        FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    `);

    console.log('✅ [Migration Phase 5B] Migration applied successfully!');
  } catch (err) {
    console.error('❌ [Migration Phase 5B] Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
