import { getSupabaseAdmin } from '../lib/supabase/admin';

async function main() {
  const admin = getSupabaseAdmin();
  const fmgeId = '58f5bdea-8637-4631-9723-e7f74a0c4543';

  const { data: anatomySubject } = await admin
    .from('exam_subjects')
    .select('id, name, slug')
    .eq('exam_id', fmgeId)
    .eq('name', 'Anatomy')
    .single();

  console.log('Anatomy Subject:', anatomySubject);

  if (anatomySubject) {
    const { data: topics } = await admin
      .from('exam_topics')
      .select('id, name, slug')
      .eq('subject_id', anatomySubject.id);
    console.log(`Anatomy has ${topics?.length || 0} topics:`, topics?.map(t => ({ id: t.id, name: t.name })));

    if (topics && topics.length > 0) {
      for (const t of topics) {
        const { data: subtopics } = await admin
          .from('exam_subtopics')
          .select('id, name, slug')
          .eq('topic_id', t.id);
        console.log(`  Topic "${t.name}" has ${subtopics?.length || 0} subtopics:`, subtopics?.map(st => st.name));
      }
    }
  }
}

main().catch(console.error);
