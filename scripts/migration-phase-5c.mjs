import pg from 'pg';
const { Client } = pg;

async function runMigration() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    console.error('POSTGRES_URL is missing.');
    process.exit(1);
  }

  const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database for Phase 5C migration.');

    await client.query('BEGIN');

    // 1. Upgrade ai_tutor_faqs table with lifecycle and hierarchy isolation
    console.log('Upgrading ai_tutor_faqs table...');
    await client.query(`
      ALTER TABLE public.ai_tutor_faqs
      ADD COLUMN IF NOT EXISTS exam_id UUID,
      ADD COLUMN IF NOT EXISTS subject_id UUID,
      ADD COLUMN IF NOT EXISTS content_version INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'CANDIDATE',
      ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_tutor_faqs_status_hierarchy 
      ON public.ai_tutor_faqs(topic_id, status, exam_id, subject_id, content_version);
    `);

    // 2. Upgrade ai_tutor_messages table with idempotency & request_id
    console.log('Upgrading ai_tutor_messages table...');
    await client.query(`
      ALTER TABLE public.ai_tutor_messages
      ADD COLUMN IF NOT EXISTS request_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_tutor_messages_idempotency
      ON public.ai_tutor_messages(lesson_id, user_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    // 3. Upgrade ai_cost_events & credit_ledger for request_id & idempotency
    console.log('Upgrading ai_cost_events and credit_ledger tables...');
    await client.query(`
      ALTER TABLE public.ai_cost_events
      ADD COLUMN IF NOT EXISTS request_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_cost_events_idempotency
      ON public.ai_cost_events(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    await client.query(`
      ALTER TABLE public.credit_ledger
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_ledger_idempotency
      ON public.credit_ledger(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    // 4. Create ai_tutor_tts_cache table for TTS cost control
    console.log('Creating ai_tutor_tts_cache table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.ai_tutor_tts_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text_hash VARCHAR(64) UNIQUE NOT NULL,
        text_content TEXT NOT NULL,
        voice VARCHAR(50) DEFAULT 'alloy',
        speed NUMERIC(3,2) DEFAULT 1.0,
        audio_base64 TEXT NOT NULL,
        content_type VARCHAR(50) DEFAULT 'audio/mpeg',
        provider VARCHAR(50) DEFAULT 'openai',
        hit_count INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_tutor_tts_cache_hash
      ON public.ai_tutor_tts_cache(text_hash);
    `);

    await client.query('COMMIT');
    console.log('Phase 5C database migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
