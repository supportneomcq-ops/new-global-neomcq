import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyIngestion() {
  const { data: countries } = await supabase.from('countries').select('id').eq('iso2', 'IN');
  const indiaId = countries?.[0]?.id;

  const { data: exams, count } = await supabase.from('exams').select('id, name, slug, authority_id', { count: 'exact' }).eq('country_id', indiaId);
  console.log(`Total exams for India (IN): ${exams?.length || 0}`);

  const batch2Slugs = [
    'upsc-ese', 'upsc-cms', 'upsc-cds', 'upsc-nda', 'upsc-capf-ac', 'upsc-ifos', 'upsc-epfo',
    'ssc-chsl', 'ssc-je', 'ssc-cpo', 'ssc-gd-constable', 'ssc-mts', 'ssc-selection-post',
    'rbi-grade-b', 'rbi-assistant', 'nabard-grade-a', 'sebi-grade-a',
    'rrb-ntpc', 'rrb-group-d', 'rrb-je', 'rrb-alp',
    'afcat', 'icag-assistant-audit-officer', 'fssai-technical-officer',
    'uppsc-pcs', 'mppsc-prelims', 'bpsc-ccce', 'wbcs-executive', 'tnpsc-group-1', 'tspsc-group-1'
  ];

  const foundBatch2 = exams?.filter(e => batch2Slugs.includes(e.slug)) || [];
  console.log(`Found Batch 2 exams inserted: ${foundBatch2.length} / ${batch2Slugs.length}`);

  const missing = batch2Slugs.filter(s => !foundBatch2.some(e => e.slug === s));
  if (missing.length > 0) {
    console.log('Missing slugs:', missing);
  }

  // Check aliases count
  const { count: aliasCount } = await supabase.from('exam_aliases').select('id', { count: 'exact', head: true });
  console.log(`Total exam aliases in DB: ${aliasCount}`);

  // Check exam_subjects count
  const { count: examSubjCount } = await supabase.from('exam_subjects').select('id', { count: 'exact', head: true });
  console.log(`Total exam_subjects in DB: ${examSubjCount}`);

  // Check exam_topics count
  const { count: examTopicCount } = await supabase.from('exam_topics').select('id', { count: 'exact', head: true });
  console.log(`Total exam_topics in DB: ${examTopicCount}`);
}

verifyIngestion();
