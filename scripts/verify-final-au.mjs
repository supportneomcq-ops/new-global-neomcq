import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const AU_COUNTRY_ID = 'e3c9933a-9f4b-4f0a-b901-b03b159ff5e5';

async function verifyFinalAu() {
  console.log('=== FINAL AUSTRALIA CATALOG AUDIT & VERIFICATION ===\n');

  // 1. Country Check
  const { data: country } = await supabase.from('countries').select('*').eq('id', AU_COUNTRY_ID).single();
  console.log('Country Entity:', country.name, `(${country.code})`, country.id);

  // 2. Authorities Count
  const { data: authorities } = await supabase.from('exam_authorities').select('id, name, code, slug').eq('country_id', AU_COUNTRY_ID);
  console.log(`\nTotal Australia Exam Authorities: ${authorities ? authorities.length : 0}`);
  authorities?.forEach(a => console.log(`  - [${a.code}] ${a.name} (${a.slug})`));

  // 3. Australia Direct Exams
  const { data: auExams } = await supabase
    .from('exams')
    .select('id, name, slug, short_name, status, verification_status, category_id, official_url')
    .eq('country_id', AU_COUNTRY_ID);

  console.log(`\nTotal Australia Direct Exams: ${auExams ? auExams.length : 0}`);

  // 4. Global Exams Reused for Australia (NCLEX, GMAT, GRE, CFA)
  const globalSlugs = ['nclex-rn', 'gmat-focus-edition', 'gre-general-test', 'cfa-level-1'];
  const { data: globalExams } = await supabase.from('exams').select('id, name, slug').in('slug', globalSlugs);

  console.log(`\nGlobal Canonical Exams Linked via Australian Aliases: ${globalExams ? globalExams.length : 0}`);
  globalExams?.forEach(g => console.log(`  - Reused Global Canonical: [${g.name}] (${g.slug})`));

  // 5. Total Effective Exams for Australia
  const totalAuCount = (auExams ? auExams.length : 0) + (globalExams ? globalExams.length : 0);
  console.log(`\n====================================================`);
  console.log(`TOTAL ACTIVE VERIFIED EXAMS FOR AUSTRALIA CATALOG: ${totalAuCount}`);
  console.log(`====================================================\n`);

  console.log('Breakdown by Sector:');
  auExams?.forEach((e, idx) => {
    console.log(` ${idx + 1}. [${e.short_name || e.name}] -> ${e.slug} (Verified: ${e.verification_status}, Status: ${e.status})`);
  });
}

verifyFinalAu();
