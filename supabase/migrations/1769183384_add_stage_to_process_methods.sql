-- Migration: add_stage_to_process_methods
-- Created at: 1769183384

-- Add stage field to distinguish pre-filling vs post-filling methods
ALTER TABLE cm_process_method ADD COLUMN IF NOT EXISTS applicable_stage VARCHAR(20) DEFAULT 'any' CHECK (applicable_stage IN ('pre_filling', 'post_filling', 'any'));

COMMENT ON COLUMN cm_process_method.applicable_stage IS 'When this method can be applied: pre_filling (before bottling), post_filling (after bottling), any (both)';;