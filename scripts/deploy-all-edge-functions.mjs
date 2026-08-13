import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = 'exzpqrqflfhawgtnzxqx';

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
const entries = fs.readdirSync(functionsDir, { withFileTypes: true });

const functionFolders = entries
  .filter(e => e.isDirectory() && !e.name.startsWith('_'))
  .map(e => e.name);

console.log(`Found ${functionFolders.length} Edge Functions to deploy:`, functionFolders);

const results = [];

for (const fn of functionFolders) {
  console.log(`\n--- Deploying Edge Function: ${fn} ---`);
  try {
    const cmd = `SUPABASE_ACCESS_TOKEN=${token} npx supabase functions deploy ${fn} --project-ref ${ref} --no-verify-jwt`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`Success deploying ${fn}:`, output.trim());
    results.push({ name: fn, status: 'DEPLOYED', error: null });
  } catch (err) {
    console.error(`Failed to deploy ${fn}:`, err.message || err);
    results.push({ name: fn, status: 'FAILED', error: err.message });
  }
}

console.log('\n=== EDGE FUNCTION DEPLOYMENT SUMMARY ===');
console.table(results);

// Verify via Management API
async function verify() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const list = await res.json();
  console.log('\n=== REMOTE DEPLOYED EDGE FUNCTIONS LIST (' + (Array.isArray(list) ? list.length : 0) + ') ===');
  if (Array.isArray(list)) {
    console.table(list.map(f => ({ slug: f.slug, name: f.name, status: f.status, updated_at: f.updated_at })));
  } else {
    console.log(list);
  }
}

verify();
