-- Migration: fix_media_spec_base_medium_code_nullable
-- Created at: 1768930931

ALTER TABLE media_compatibility_spec ALTER COLUMN base_medium_code DROP NOT NULL;;