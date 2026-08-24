import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const UK_COUNTRY_ID = '53f43aaa-5d56-467b-ba77-351899847efb';

// Import UK_EXAMS and AUTHORITIES from seed-uk-catalog.js or re-export
import { UK_EXAMS, AUTHORITIES, CATEGORIES } from './uk-data.js';

async function fastSeed() {
  console.log('Fast seeding UK catalog...');

  // Get authorities map
  const { data: auths } = await supabase.from('exam_authorities').select('id, code').eq('country_id', UK_COUNTRY_ID);
  const authorityMap = {};
  auths.forEach(a => { authorityMap[a.code] = a.id; });

  // Get existing exams
  const { data: dbExams } = await supabase.from('exams').select('id, slug').eq('country_id', UK_COUNTRY_ID);
  const existingSlugs = new Set(dbExams?.map(e => e.slug) || []);

  const remaining = UK_EXAMS.filter(e => !existingSlugs.has(e.slug));
  console.log(`Remaining exams to seed: ${remaining.length}`);

  for (const examData of remaining) {
    const authorityId = authorityMap[examData.authority_code];
    if (!authorityId) {
      console.error(`Missing authority for ${examData.authority_code}`);
      continue;
    }

    // Insert Exam
    const { data: newExam, error: examErr } = await supabase
      .from('exams')
      .insert({
        country_id: UK_COUNTRY_ID,
        authority_id: authorityId,
        category_id: examData.category_id,
        name: examData.name,
        slug: examData.slug,
        short_name: examData.short_name,
        description: examData.description,
        difficulty: examData.difficulty,
        question_count: examData.question_count,
        time_limit_mins: examData.time_limit_mins,
        is_featured: examData.is_featured,
        status: 'active',
        verification_status: 'verified',
        official_url: examData.official_url,
        official_notification_url: examData.official_notification_url,
        official_syllabus_url: examData.official_syllabus_url,
        exam_type: examData.exam_type,
        level: examData.level,
        mode: examData.mode,
        duration: examData.duration,
        total_marks: examData.total_marks,
        negative_marking: examData.negative_marking,
        passing_criteria: examData.passing_criteria,
        eligibility: examData.eligibility,
        attempt_rules: examData.attempt_rules,
        selection_process: examData.selection_process,
        stages: examData.stages,
        papers: examData.papers,
        languages: examData.languages,
        current_version: '2026',
        version_year: 2026,
        is_current: true,
        source_url: examData.official_url,
        last_verified_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (examErr) {
      console.error(`Error inserting exam ${examData.slug}:`, examErr);
      continue;
    }
    const examId = newExam.id;
    console.log(`Fast inserted exam: ${examData.name} (${examData.slug})`);

    // Insert Version
    await supabase.from('exam_versions').insert({
      exam_id: examId,
      version_name: '2026 Standard Edition',
      version_year: 2026,
      is_current: true,
    });

    // Insert Aliases
    if (examData.aliases && examData.aliases.length > 0) {
      const aliasInserts = examData.aliases.map(a => ({ exam_id: examId, alias: a }));
      await supabase.from('exam_aliases').insert(aliasInserts);
    }

    // Insert Subjects & Topics
    if (examData.subjects && examData.subjects.length > 0) {
      for (const subjData of examData.subjects) {
        const subjSlug = `${examData.slug}-${subjData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        let subjectId;
        const { data: existingMasterSubj } = await supabase
          .from('subjects')
          .select('id')
          .eq('slug', subjSlug)
          .maybeSingle();

        if (existingMasterSubj) {
          subjectId = existingMasterSubj.id;
        } else {
          const { data: newMasterSubj } = await supabase
            .from('subjects')
            .insert({
              category_id: examData.category_id,
              name: subjData.name,
              slug: subjSlug,
              description: subjData.description,
            })
            .select('id')
            .single();
          if (newMasterSubj) subjectId = newMasterSubj.id;
        }

        if (!subjectId) continue;

        // Exam Subject
        const { data: newExamSubj } = await supabase
          .from('exam_subjects')
          .insert({
            exam_id: examId,
            subject_id: subjectId,
            name: subjData.name,
            official_name: subjData.official_name,
            display_name: subjData.name,
            description: subjData.description,
            weight_percentage: subjData.weight,
            required: true,
            active: true,
            verification_status: 'verified',
            source_url: examData.official_url,
            last_verified_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        // Topics
        if (subjData.topics && subjData.topics.length > 0) {
          for (const topicName of subjData.topics) {
            const topicSlug = `${subjSlug}-${topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

            let topicId;
            const { data: existingMasterTopic } = await supabase
              .from('topics')
              .select('id')
              .eq('slug', topicSlug)
              .maybeSingle();

            if (existingMasterTopic) {
              topicId = existingMasterTopic.id;
            } else {
              const { data: newMasterTopic } = await supabase
                .from('topics')
                .insert({
                  subject_id: subjectId,
                  name: topicName,
                  slug: topicSlug,
                  description: `Core topic: ${topicName} for ${subjData.name}`,
                  importance: 'High',
                })
                .select('id')
                .single();
              if (newMasterTopic) topicId = newMasterTopic.id;
            }

            if (topicId) {
              await supabase.from('exam_topics').insert({
                subject_id: subjectId,
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
            }
          }
        }
      }
    }
  }

  console.log('Fast seed complete!');
}

fastSeed();
