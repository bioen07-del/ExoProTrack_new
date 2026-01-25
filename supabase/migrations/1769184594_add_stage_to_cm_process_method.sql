-- Migration: add_stage_to_cm_process_method
-- Created at: 1769184594

ALTER TABLE cm_process_method ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'pre_filling' CHECK (stage IN ('pre_filling', 'post_filling'));;