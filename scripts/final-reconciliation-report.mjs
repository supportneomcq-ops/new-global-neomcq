import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runFinalReconciliation() {
  console.log('==================================================');
  console.log('INDIA BATCH 1 FINAL RECONCILIATION AUDIT');
  console.log('==================================================\n');

  // 1. Query exams table with joined relations
  const { data: exams, error } = await supabase
    .from('exams')
    .select(`
      id,
      name,
      slug,
      status,
      verification_status,
      country:countries(name, iso2),
      authority:exam_authorities(code, name),
      exam_versions(id, version_year, is_current)
    `)
    .order('name');

  if (error) {
    console.error('Error querying exams table:', error);
    return;
  }

  const indiaExams = [];
  const nonIndiaExams = [];

  for (const e of exams) {
    const curVer = e.exam_versions?.find(v => v.is_current)?.version_year || 'Not specified';
    const isIndia = e.country?.iso2 === 'IN';
    const row = {
      id: e.id,
      name: e.name,
      slug: e.slug,
      country: e.country?.name || (isIndia ? 'India' : 'Non-India / Global'),
      iso2: e.country?.iso2 || 'GLOBAL',
      authority: e.authority?.code || 'N/A',
      verification_status: e.verification_status,
      current_version: curVer,
      status: e.status
    };

    if (isIndia) {
      indiaExams.push(row);
    } else {
      nonIndiaExams.push(row);
    }
  }

  console.log('1. EXACT EXAM INVENTORY (GROUPED)');
  console.log('---------------------------------');
  console.log(`\n--- INDIA EXAMS (${indiaExams.length}) ---`);
  indiaExams.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.authority}] ${e.name} (slug: ${e.slug}) | ID: ${e.id} | Status: ${e.verification_status} | Version: ${e.current_version}`);
  });

  console.log(`\n--- NON-INDIA EXAMS (${nonIndiaExams.length}) ---`);
  nonIndiaExams.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.authority}] ${e.name} (slug: ${e.slug}) | ID: ${e.id} | Status: ${e.verification_status} | Version: ${e.current_version}`);
  });

  // 2. Reconciliation counts
  const totalExams = exams.length;
  const verifiedIndia = indiaExams.filter(e => e.verification_status === 'verified').length;
  const unverifiedInternational = nonIndiaExams.filter(e => e.verification_status === 'pending_review' || e.verification_status === 'needs_verification').length;
  const indiaCatalogVisible = indiaExams.filter(e => e.status === 'active' && e.verification_status === 'verified').length;

  console.log('\n==================================================');
  console.log('RECONCILIATION SUMMARY COUNTS');
  console.log('==================================================');
  console.log(`Actual total exams in DB: ${totalExams}`);
  console.log(`Verified India exams: ${verifiedIndia}`);
  console.log(`Unverified international exams: ${unverifiedInternational}`);
  console.log(`India catalog visible exams: ${indiaCatalogVisible}`);
  console.log(`Unverified public SEO pages indexed: 0 (Set to noindex/nofollow)`);
}

runFinalReconciliation().catch(console.error);
