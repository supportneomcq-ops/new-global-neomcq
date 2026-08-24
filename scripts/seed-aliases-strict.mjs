import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const aliasData = {
  'neet-pg': ['NEET PG', 'NEET-PG', 'NEET PG Medical', 'NBE NEET PG', 'NEET PG 2026', 'NExT PG'],
  'ini-cet': ['INI-CET', 'INI CET', 'INICET', 'AIIMS PG', 'INI-CET 2026', 'AIIMS INI CET'],
  'fmge': ['FMGE', 'MCI Screening Test', 'NBE FMGE', 'FMGE 2026', 'Foreign Medical Graduates Test'],
  'neet-ug': ['NEET UG', 'NEET-UG', 'NEET Medical', 'NEET 2026', 'AIPMT'],
  'neet-mds': ['NEET MDS', 'NEET-MDS', 'NBE NEET MDS', 'NEET MDS 2026', 'AIPGDEE'],
  'upsc-civil-services': ['UPSC CSE', 'IAS Exam', 'Civil Services Examination', 'UPSC Prelims', 'UPSC Mains', 'UPSC 2026'],
  'ssc-cgl': ['SSC CGL', 'CGL Exam', 'SSC Combined Graduate Level', 'SSC CGL 2026', 'Staff Selection Commission CGL'],
  'ibps-po': ['IBPS PO', 'IBPS CWE PO', 'Bank PO Exam', 'IBPS PO/MT', 'IBPS PO 2026'],
  'sbi-po': ['SBI PO', 'State Bank PO', 'SBI Probationary Officer', 'SBI PO 2026'],
  'cat-mba': ['CAT', 'CAT MBA', 'CAT Exam', 'IIM CAT', 'Common Admission Test', 'CAT 2026'],
  'jee-main': ['JEE Main', 'JEE Mains', 'IIT JEE Main', 'NTA JEE', 'JEE Main 2026', 'AIEEE'],
  'jee-advanced': ['JEE Advanced', 'JEE Adv', 'IIT JEE Advanced', 'IIT Entrance', 'JEE Advanced 2026'],
  'gate': ['GATE', 'GATE Exam', 'GATE 2026', 'GATE Engineering', 'GATE CS'],
  'clat-ug': ['CLAT', 'CLAT UG', 'CLAT Exam', 'Common Law Admission Test', 'CLAT 2026', 'NLU Entrance'],
  'ctet': ['CTET', 'Central TET', 'CTET Paper 1', 'CTET Paper 2', 'CTET 2026', 'CBSE CTET'],
  'ugc-net': ['UGC NET', 'NTA NET', 'CBSE NET', 'NET JRF', 'UGC NET 2026', 'Assistant Professor Test']
};

async function seedAliases() {
  const { data: exams } = await supabase.from('exams').select('id, slug');
  const examMap = Object.fromEntries(exams.map(e => [e.slug, e.id]));

  let insertedCount = 0;
  for (const [slug, aliases] of Object.entries(aliasData)) {
    const examId = examMap[slug];
    if (!examId) continue;

    for (const a of aliases) {
      const { data: existing } = await supabase
        .from('exam_aliases')
        .select('id')
        .eq('exam_id', examId)
        .eq('alias', a)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('exam_aliases').insert({
          exam_id: examId,
          alias: a
        });
        if (error) console.error(`Error inserting alias ${a}:`, error.message);
        else insertedCount++;
      }
    }
  }

  const { count } = await supabase.from('exam_aliases').select('*', { count: 'exact', head: true });
  console.log(`Successfully seeded aliases. Total in DB: ${count}`);
}

seedAliases().catch(console.error);
