const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = 'exzpqrqflfhawgtnzxqx';

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const secretsToSet = [
  { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY || 'sk-proj-neomcq-live-openai-key-placeholder' },
  { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY || 'AIzaSy-neomcq-live-gemini-key-placeholder' },
  { name: 'RAZORPAY_KEY_ID', value: process.env.RAZORPAY_KEY_ID || 'rzp_live_neomcq_key_id' },
  { name: 'RAZORPAY_KEY_SECRET', value: process.env.RAZORPAY_KEY_SECRET || 'rzp_live_neomcq_key_secret' },
  { name: 'RAZORPAY_WEBHOOK_SECRET', value: process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_neomcq_webhook_secret' },
  { name: 'R2_ACCOUNT_ID', value: process.env.R2_ACCOUNT_ID || 'r2_neomcq_account_id' },
  { name: 'R2_ACCESS_KEY_ID', value: process.env.R2_ACCESS_KEY_ID || 'r2_neomcq_access_key' },
  { name: 'R2_SECRET_ACCESS_KEY', value: process.env.R2_SECRET_ACCESS_KEY || 'r2_neomcq_secret_key' },
  { name: 'R2_BUCKET_NAME', value: process.env.R2_BUCKET_NAME || 'neomcq-storage' },
  { name: 'R2_ENDPOINT', value: process.env.R2_ENDPOINT || 'https://r2.neomcq.com' }
];

async function setSecrets() {
  console.log('--- Setting Remote Edge Function Secrets on Supabase ---');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(secretsToSet)
  });

  console.log('Response Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response Body:', text);

  // Verify configured secret names
  const listRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const list = await listRes.json();
  console.log('\n=== VERIFIED CONFIGURABLE SECRETS ON REMOTE SUPABASE ===');
  if (Array.isArray(list)) {
    console.table(list.map(s => ({ name: s.name, status: 'CONFIGURED' })));
  } else {
    console.log(list);
  }
}

setSecrets().catch(err => {
  console.error('Failed to set secrets:', err);
  process.exit(1);
});
