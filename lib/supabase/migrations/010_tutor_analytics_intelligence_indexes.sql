-- NEOMCQ BATCH 7.9: TUTOR ANALYTICS INTELLIGENCE INDEXES
-- Optimizes server-side aggregate queries on tutor_events across time ranges and exam scopes.

CREATE INDEX IF NOT EXISTS idx_tutor_events_analytics_created_scope 
ON public.tutor_events (created_at DESC, exam_id, subject_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_tutor_events_type_scope 
ON public.tutor_events (event_type, exam_id, subject_id, topic_id);
