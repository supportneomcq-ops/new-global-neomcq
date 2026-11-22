-- The canonical topic pack must fit all required assets in one structured response.
-- The shared test grant remains capped at $5; it permits up to three bounded attempts.
UPDATE public.ai_task_routing
SET max_input_tokens=16384,
    max_output_tokens=8192,
    updated_at=now()
WHERE task_type='MCQ_GENERATION';

UPDATE public.platform_ai_test_budget_grants
SET max_reservations=3
WHERE authorization_reference='chat-approval-2026-11-23-neomcq-test-cap-5usd';
