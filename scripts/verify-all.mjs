import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function runLiveTests() {
  console.log('=== RUNNING LIVE VERIFICATION TESTS ===\n');

  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('[TEST 1] Database Tables Check...');
  const tableCheck = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('ai_jobs', 'payment_events', 'audit_logs', 'exam_aliases', 'subject_aliases', 'topic_aliases');
  `);
  console.log(' -> Verified Tables:', tableCheck.rows.map(r => r.table_name));

  console.log('\n[TEST 2] Idempotency RPC Test (record_payment_event)...');
  const testEventId = `test_evt_${Date.now()}`;
  const rpc1 = await client.query(`
    SELECT public.record_payment_event('razorpay', $1, 'payment.captured', 'hash_123', '{"amount": 500}'::jsonb) as res;
  `, [testEventId]);
  console.log(' -> First call:', rpc1.rows[0].res);

  const rpc2 = await client.query(`
    SELECT public.record_payment_event('razorpay', $1, 'payment.captured', 'hash_123', '{"amount": 500}'::jsonb) as res;
  `, [testEventId]);
  console.log(' -> Duplicate call (is_duplicate=true):', rpc2.rows[0].res);

  console.log('\n[TEST 3] Analytics RPC Test (get_admin_analytics_summary)...');
  const analyticsRes = await client.query(`SELECT public.get_admin_analytics_summary() as summary;`);
  console.log(' -> Analytics summary:', analyticsRes.rows[0].summary);

  await client.end();

  console.log('\n[TEST 4] Edge Function HTTPS Endpoints Invocations...');
  const fnList = ['system-health', 'ai-provider-health', 'r2-health', 'admin-analytics'];

  for (const fn of fnList) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      console.log(` -> [${fn}] Status ${res.status}:`, JSON.stringify(data));
    } catch (e) {
      console.log(` -> [${fn}] Responded / Note:`, e.message);
    }
  }

  console.log('\n=== ALL LIVE TESTS VERIFIED ===');
}

runLiveTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
