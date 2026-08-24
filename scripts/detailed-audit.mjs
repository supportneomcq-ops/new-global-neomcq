import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runDetailedAudit() {
  const { data: exams } = await adminClient
    .from('exams')
    .select(`
      id,
      name,
      slug,
      short_name,
      country_id,
      official_url,
      official_notification_url,
      official_syllabus_url,
      verification_status,
      last_verified_at,
      country:countries(name, iso2),
      authority:exam_authorities(code, name),
      exam_versions(id, version_year, is_current, official_notification_url, official_syllabus_url, pattern_summary),
      exam_subjects(
        id,
        name,
        official_name,
        display_name,
        weight_percentage,
        subject:subjects(id, name, slug),
        exam_topics(
          id,
          name,
          official_name,
          importance,
          topic:topics(id, name, slug)
        )
      ),
      exam_aliases(id, alias)
    `)
    .order('name');

  console.log('=== ALL DATABASE EXAMS IN SUPABASE ===');
  console.log(`Total Exams: ${exams.length}`);
  
  exams.forEach((e, idx) => {
    const curVer = e.exam_versions?.find(v => v.is_current)?.version_year || 'None';
    const subCount = e.exam_subjects?.length || 0;
    const topCount = e.exam_subjects?.reduce((acc, s) => acc + (s.exam_topics?.length || 0), 0) || 0;
    const aliasCount = e.exam_aliases?.length || 0;
    console.log(`${idx + 1}. [${e.country?.iso2 || 'GLOBAL'}] ${e.name} (${e.slug}) | Auth: ${e.authority?.code || 'None'} | Ver: ${curVer} | Subjs: ${subCount} | Topics: ${topCount} | Aliases: ${aliasCount} | Status: ${e.verification_status}`);
  });

  console.log('\n=== CHECKING SPECIFIC TARGET EXAMS LISTED IN PROMPT ===');
  const targetList = [
    'NEET PG',
    'INI-CET',
    'FMGE',
    'NEET UG',
    'NEET MDS',
    'UPSC Civil Services',
    'UPSC Engineering Services',
    'UPSC CMS',
    'SSC CGL',
    'SSC CHSL',
    'SSC JE',
    'IBPS PO',
    'IBPS Clerk',
    'SBI PO',
    'CAT',
    'JEE Main',
    'JEE Advanced',
    'GATE',
    'CLAT',
    'CTET',
    'UGC NET'
  ];

  targetList.forEach(target => {
    const match = exams.find(e => 
      e.name.toLowerCase().includes(target.toLowerCase()) || 
      e.short_name?.toLowerCase() === target.toLowerCase() ||
      e.slug.toLowerCase().includes(target.toLowerCase().replace(/\s+/g, '-')) ||
      (e.exam_aliases && e.exam_aliases.some(a => a.alias.toLowerCase() === target.toLowerCase()))
    );

    if (match) {
      console.log(`✓ ${target} -> "${match.name}" [Authority: ${match.authority?.code || 'N/A'}, Official URL: ${match.official_url || 'N/A'}]`);
    } else {
      console.log(`✗ ${target} -> NOT IN DB (Needs Verification / Ingestion)`);
    }
  });

  const { count: aliasCount } = await adminClient.from('exam_aliases').select('*', { count: 'exact', head: true });
  console.log(`\nTotal Aliases in DB: ${aliasCount}`);
}

runDetailedAudit().catch(console.error);
