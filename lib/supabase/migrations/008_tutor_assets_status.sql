-- NEOMCQ BATCH 7.5: TUTOR ASSETS STATUS & METADATA EXTENSION
-- Idempotent column and index additions for Tutor visual asset lifecycle

ALTER TABLE public.tutor_assets 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'READY';

CREATE INDEX IF NOT EXISTS idx_tutor_assets_status ON public.tutor_assets (status);
