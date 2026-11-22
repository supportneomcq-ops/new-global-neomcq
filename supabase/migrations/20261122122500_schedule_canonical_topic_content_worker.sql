-- Run the shared canonical topic-content queue independently of Vercel Hobby cron limits.
-- Reuse the existing Vault token already used by the curriculum worker; never store it in source.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'neomcq-canonical-topic-content-worker'
  ) THEN
    PERFORM cron.schedule(
      'neomcq-canonical-topic-content-worker',
      '* * * * *',
      $job$
        SELECT net.http_get(
          url := 'https://neomcq.com/api/cron/topic-content-worker',
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
        );
      $job$
    );
  END IF;
END
$$;
