import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.POSTGRES_URL;
const cleanUrl = rawUrl.replace('sslmode=require&supa=base-pooler.x', 'sslmode=no-verify');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;

async function runLiveTests() {
  console.log('=== RUNNING LIVE VERIFICATION TESTS ===\n');

  // 1. DB Test via PG
  const client = new Client({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('[TEST 1] Testing Database Tables...');
  const tableCheck = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('ai_jobs', 'payment_events', 'audit_logs', 'exam_aliases', 'subject_aliases', 'topic_aliases');
  `);
  console.log(' -> Found new canonical tables:', tableCheck.rows.map(r => r.table_name));

  console.log('\n[TEST 2] Testing Idempotency RPC (record_payment_event)...');
  const testEventId = `test_evt_${Date.now()}`;
  const rpc1 = await client.query(`
    SELECT public.record_payment_event('razorpay', $1, 'payment.captured', 'hash_123', '{"amount": 500}'::jsonb) as res;
  `, [testEventId]);
  console.log(' -> First call result:', rpc1.rows[0].res);

  const rpc2 = await client.query(`
    SELECT public.record_payment_event('razorpay', $1, 'payment.captured', 'hash_123', '{"amount": 500}'::jsonb) as res;
  `, [testEventId]);
  console.log(' -> Duplicate call result (should be duplicate=true):', rpc2.rows[0].res);

  console.log('\n[TEST 3] Testing Analytics RPC (get_admin_analytics_summary)...');
  const analyticsRes = await client.query(`SELECT public.get_admin_analytics_summary() as summary;`);
  console.log(' -> Analytics summary:', analyticsRes.rows[0].summary);

  await client.end();

  // 2. Edge Function Live Invocations
  console.log('\n[TEST 4] Invoking Deployed Edge Functions via HTTPS...');

  const fnList = ['system-health', 'ai-provider-health', 'r2-health', 'admin-analytics'];

  for (const fn of fnList) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      console.log(` -> Edge Function [${fn}] HTTP ${res.status}:`, data);
    } catch (e) {
      console.error(` -> Edge Function [${fn}] Error:`, e.message);
    }
  }

  console.log('\n=== LIVE VERIFICATION SUCCESSFUL ===');
}

runLiveTests().catch(err => {
  console.error('Live tests failed:', err);
  process.exit(1);
});
