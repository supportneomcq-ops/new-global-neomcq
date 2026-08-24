import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function reconcileInventory() {
  console.log('=== EXACT EXAM INVENTORY RECONCILIATION ===\n');

  // Fetch all exams
  const { data: exams, error } = await adminClient
    .from('exams')
    .select(`
      id,
      name,
      slug,
      verification_status,
      country:countries(name, iso2),
      authority:exam_authorities(code, name),
      exam_versions(id, version_year, is_current)
    `)
    .order('name');

  if (error) {
    console.error('Error fetching exams:', error);
    return;
  }

  console.log(`Total exams found: ${exams.length}`);

  // Separate India and Non-India
  const indiaExams = [];
  const nonIndiaExams = [];

  for (const e of exams) {
    const curVer = e.exam_versions?.find(v => v.is_current)?.version_year || 'Not specified';
    const isIndia = e.country?.iso2 === 'IN';
    const record = {
      id: e.id,
      name: e.name,
      slug: e.slug,
      country: e.country?.name || (isIndia ? 'India' : 'Non-India / Global'),
      iso2: e.country?.iso2 || 'GLOBAL',
      authority: e.authority?.code || 'N/A',
      verification_status: e.verification_status,
      current_version: curVer
    };

    if (isIndia) {
      indiaExams.push(record);
    } else {
      nonIndiaExams.push(record);
    }
  }

  // Check verification status of non-India exams and update to 'needs_verification' if not already
  for (const nonInd of nonIndiaExams) {
    if (nonInd.verification_status !== 'needs_verification') {
      console.log(`Updating ${nonInd.name} (${nonInd.slug}) verification_status to 'needs_verification'...`);
      const { error: updErr } = await adminClient
        .from('exams')
        .update({ verification_status: 'needs_verification' })
        .eq('id', nonInd.id);
      if (updErr) console.error('Error updating status:', updErr);
      else nonInd.verification_status = 'needs_verification';
    }
  }

  console.log('\n--- INDIA EXAMS ---');
  console.table(indiaExams);

  console.log('\n--- NON-INDIA EXAMS ---');
  console.table(nonIndiaExams);

  console.log('\nSummary counts:');
  console.log(`Total exams in DB: ${exams.length}`);
  console.log(`India exams (verified): ${indiaExams.filter(e => e.verification_status === 'verified').length}`);
  console.log(`Non-India exams (needs_verification): ${nonIndiaExams.filter(e => e.verification_status === 'needs_verification').length}`);
}

reconcileInventory().catch(console.error);
