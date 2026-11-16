-- Process the queued existing-exam curriculum backfill one job at a time.
-- The conditional prevents overlapping backfill workers and stops polling when the queue is empty.
SELECT cron.schedule(
  'neomcq-curriculum-backfill',
  '* * * * *',
  $worker$
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM public.ai_jobs
        WHERE task = 'curriculum_rebuild'
          AND status IN ('queued', 'failed')
          AND attempts < 3
          AND input_payload->>'source' = 'existing_exam_backfill'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.ai_jobs
        WHERE task = 'curriculum_rebuild'
          AND status = 'processing'
          AND input_payload->>'source' = 'existing_exam_backfill'
      )
      THEN net.http_get(
        url := 'https://neomcq.com/api/cron/curriculum-worker?backfill=1',
        headers := jsonb_build_object(
          'Authorization',
          'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'neomcq_curriculum_worker_token'
            LIMIT 1
          )
        ),
        timeout_milliseconds := 300000
      )
      ELSE NULL
    END;
  $worker$
);
