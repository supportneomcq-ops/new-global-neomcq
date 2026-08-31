import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function cleanupAndFix() {
  const url = new URL(process.env.POSTGRES_URL);
  url.searchParams.delete('sslmode');
  
  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to DB.');

  // 1. Identify mock/test exams
  const testExamsRes = await client.query(`
    SELECT id, name, slug 
    FROM public.exams 
    WHERE slug ILIKE 'test-exam-%' 
       OR slug ILIKE 'preseeded-5e-%' 
       OR slug ILIKE 'empty-exam-%' 
       OR name ILIKE 'Shopping List %'
       OR name ILIKE 'Test Exam 5D%'
       OR name ILIKE 'Test Exam 5E%';
  `);

  console.log(`Found ${testExamsRes.rows.length} test/mock exams to remove:`, testExamsRes.rows.map(r => r.name));

  const testExamIds = testExamsRes.rows.map(r => r.id);

  if (testExamIds.length > 0) {
    // Delete associated subtopics
    await client.query(`
      DELETE FROM public.exam_subtopics 
      WHERE topic_id IN (
        SELECT t.id FROM public.exam_topics t
        JOIN public.exam_subjects s ON t.subject_id = s.id
        WHERE s.exam_id = ANY($1)
      );
    `, [testExamIds]);

    // Delete associated topics
    await client.query(`
      DELETE FROM public.exam_topics 
      WHERE subject_id IN (
        SELECT id FROM public.exam_subjects WHERE exam_id = ANY($1)
      );
    `, [testExamIds]);

    // Delete associated subjects
    await client.query(`
      DELETE FROM public.exam_subjects WHERE exam_id = ANY($1);
    `, [testExamIds]);

    // Delete associated user_exams / ai_jobs / topic_content_state
    await client.query(`DELETE FROM public.user_exams WHERE exam_id = ANY($1);`, [testExamIds]);
    await client.query(`DELETE FROM public.ai_jobs WHERE exam_id = ANY($1);`, [testExamIds]);
    await client.query(`DELETE FROM public.exam_aliases WHERE exam_id = ANY($1);`, [testExamIds]);
    await client.query(`DELETE FROM public.exams WHERE id = ANY($1);`, [testExamIds]);
    console.log('✓ Cleaned up test exams and their child records.');
  }

  // 2. Fix real users
  // Get FMGE exam ID
  const fmgeRes = await client.query(`
    SELECT id, name FROM public.exams WHERE slug = 'fmge' OR name ILIKE '%FMGE%' LIMIT 1;
  `);
  const fmgeId = fmgeRes.rows[0]?.id;
  console.log('FMGE Exam ID:', fmgeId);

  // Fix Naina Malhotra
  const nainaId = '77adfbf4-abc8-42d3-a744-ad207d7c42fd';
  if (fmgeId) {
    await client.query(`
      UPDATE public.profiles 
      SET current_exam_id = $1,
          exam_locked = TRUE,
          exam_selected_at = NOW(),
          exam_switch_count = 0,
          first_name = 'Naina',
          last_name = 'Malhotra'
      WHERE id = $2;
    `, [fmgeId, nainaId]);

    await client.query(`
      INSERT INTO public.user_exams (user_id, exam_id, target_date, target_score, status)
      VALUES ($1, $2, '2026-12-09', 85, 'in_progress')
      ON CONFLICT (user_id, exam_id) DO UPDATE SET target_date = '2026-12-09', status = 'in_progress';
    `, [nainaId, fmgeId]);

    await client.query(`
      INSERT INTO public.study_preferences (user_id, daily_hours, preferred_time, learning_mode, reminders_enabled)
      VALUES ($1, 3.0, 'morning', 'balanced', TRUE)
      ON CONFLICT (user_id) DO UPDATE SET daily_hours = 3.0, preferred_time = 'morning';
    `, [nainaId]);

    console.log('✓ Fixed Naina Malhotra (FMGE + 2026-12-09 target date + preferences)');
  }

  // Fix Swapnil Sonawane
  const swapnilId = 'd7df7dd6-670a-4fe6-ae17-542bd6a08778';
  if (fmgeId) {
    await client.query(`
      UPDATE public.profiles 
      SET current_exam_id = $1,
          exam_locked = TRUE,
          exam_selected_at = NOW(),
          exam_switch_count = 0,
          first_name = 'Swapnil',
          last_name = 'Sonawane'
      WHERE id = $2;
    `, [fmgeId, swapnilId]);

    await client.query(`
      INSERT INTO public.user_exams (user_id, exam_id, target_date, target_score, status)
      VALUES ($1, $2, '2026-12-09', 85, 'in_progress')
      ON CONFLICT (user_id, exam_id) DO UPDATE SET target_date = '2026-12-09', status = 'in_progress';
    `, [swapnilId, fmgeId]);

    await client.query(`
      INSERT INTO public.study_preferences (user_id, daily_hours, preferred_time, learning_mode, reminders_enabled)
      VALUES ($1, 3.0, 'morning', 'balanced', TRUE)
      ON CONFLICT (user_id) DO UPDATE SET daily_hours = 3.0, preferred_time = 'morning';
    `, [swapnilId]);

    console.log('✓ Fixed Swapnil Sonawane (FMGE + 2026-12-09 target date + preferences)');
  }

  await client.end();
}

cleanupAndFix().catch(console.error);
