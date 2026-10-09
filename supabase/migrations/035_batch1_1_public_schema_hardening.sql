-- ==============================================================================
-- Migration: 035_batch1_1_public_schema_hardening.sql
-- Description: NEOMCQ Batch 1.1 - Public Schema Privilege Hardening
-- Purpose:
--   Revoke CREATE privileges on schema public from PUBLIC, anon, and authenticated
--   roles to eliminate public-schema object-creation / object-shadowing risks.
--   Preserves USAGE privileges on schema public for all legitimate operations.
-- ==============================================================================

-- 1. Revoke CREATE on schema public from unprivileged roles and default PUBLIC pseudo-role
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM anon;
REVOKE CREATE ON SCHEMA public FROM authenticated;

-- 2. Explicitly ensure USAGE on schema public is preserved for legitimate operations
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE, CREATE ON SCHEMA public TO service_role;
GRANT USAGE, CREATE ON SCHEMA public TO postgres;
