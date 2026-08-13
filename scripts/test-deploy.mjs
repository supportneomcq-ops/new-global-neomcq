const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = 'exzpqrqflfhawgtnzxqx';

async function testSecrets() {
  console.log('--- Testing Secrets Management API ---');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      { name: 'SYSTEM_AUDIT_VERIFIED', value: 'TRUE' }
    ])
  });
  console.log('Set secrets status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response:', text);

  // Get secrets
  const getRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Secrets list:', await getRes.json());
}

testSecrets();
