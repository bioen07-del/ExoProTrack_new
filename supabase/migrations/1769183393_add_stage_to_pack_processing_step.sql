-- Migration: add_stage_to_pack_processing_step
-- Created at: 1769183393

-- Add stage field to track processing stage (pre-fill vs post-fill)
ALTER TABLE pack_processing_step ADD COLUMN IF NOT EXISTS processing_stage VARCHAR(20) DEFAULT 'pre_filling' CHECK (processing_stage IN ('pre_filling', 'post_filling'));

COMMENT ON COLUMN pack_processing_step.processing_stage IS 'Processing stage: pre_filling (before bottling) or post_filling (after bottling)';;