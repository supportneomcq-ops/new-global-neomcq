import { createClient } from '@supabase/supabase-js';
import { UK_EXAMS } from './uk-data.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const UK_COUNTRY_ID = '53f43aaa-5d56-467b-ba77-351899847efb';

async function fixUKTopics() {
  console.log('=== SEEDING ALL UK EXAM TOPICS AND LINKS ===\n');

  // Fetch all UK exams
  const { data: ukExams, error: examErr } = await supabase
    .from('exams')
    .select('id, slug, name')
    .eq('country_id', UK_COUNTRY_ID);

  if (examErr || !ukExams) {
    console.error('Failed to fetch UK exams:', examErr);
    return;
  }

  console.log(`Found ${ukExams.length} UK Exams in DB.`);

  // Fetch all exam_subjects for these exams
  const examIds = ukExams.map(e => e.id);
  const { data: examSubjs, error: subjErr } = await supabase
    .from('exam_subjects')
    .select('id, exam_id, name, subject_id')
    .in('exam_id', examIds);

  if (subjErr) {
    console.error('Failed to fetch exam_subjects:', subjErr);
    return;
  }

  console.log(`Found ${examSubjs?.length || 0} exam_subjects in DB.`);
  console.log(`Loaded ${UK_EXAMS.length} UK exam definitions from uk-data.js.\n`);

  let totalTopicsSeeded = 0;

  for (const examData of UK_EXAMS) {
    const dbExam = ukExams.find(e => e.slug === examData.slug);
    if (!dbExam) {
      console.warn(`Exam ${examData.slug} not found in DB`);
      continue;
    }

    if (!examData.subjects || examData.subjects.length === 0) continue;

    for (const subjData of examData.subjects) {
      const dbSubj = examSubjs.find(s => s.exam_id === dbExam.id && s.name === subjData.name);
      if (!dbSubj) {
        console.warn(`Exam Subject ${subjData.name} for exam ${dbExam.slug} not found in DB`);
        continue;
      }

      if (!subjData.topics || subjData.topics.length === 0) continue;

      for (const topicName of subjData.topics) {
        const topicSlug = `${dbExam.slug}-${subjData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        // 1. Master topic
        let topicId;
        const { data: existingMasterTopic } = await supabase
          .from('topics')
          .select('id')
          .eq('slug', topicSlug)
          .maybeSingle();

        if (existingMasterTopic) {
          topicId = existingMasterTopic.id;
        } else {
          const { data: newMasterTopic, error: masterTopicErr } = await supabase
            .from('topics')
            .insert({
              subject_id: dbSubj.subject_id,
              name: topicName,
              slug: topicSlug,
              description: `Core topic: ${topicName} for ${subjData.name}`,
              importance: 'High',
            })
            .select('id')
            .single();

          if (masterTopicErr) {
            console.error(`Error inserting master topic ${topicName}:`, masterTopicErr.message);
            continue;
          }
          topicId = newMasterTopic.id;
        }

        // 2. Exam Topic linking to exam_subjects.id (dbSubj.id)
        const { data: existingExamTopic } = await supabase
          .from('exam_topics')
          .select('id')
          .eq('subject_id', dbSubj.id)
          .eq('name', topicName)
          .maybeSingle();

        if (!existingExamTopic) {
          const { error: examTopicErr } = await supabase
            .from('exam_topics')
            .insert({
              subject_id: dbSubj.id, // Correct FK to exam_subjects.id!
              topic_id: topicId,
              name: topicName,
              official_name: topicName,
              display_name: topicName,
              description: topicName,
              importance: 'High',
              active: true,
              verification_status: 'verified',
              source_url: examData.official_url,
              last_verified_at: new Date().toISOString(),
            });

          if (examTopicErr) {
            console.error(`Error linking exam topic ${topicName} to subject ${dbSubj.name}:`, examTopicErr.message);
          } else {
            totalTopicsSeeded++;
          }
        } else {
          totalTopicsSeeded++;
        }
      }
    }
  }

  console.log(`\nFINISHED TOPICS SEEDING! Total exam topics in place: ${totalTopicsSeeded}`);
}

fixUKTopics();
