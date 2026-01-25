-- Migration: add_cycle_no_to_processing_step
-- Created at: 1768817778

ALTER TABLE processing_step ADD COLUMN IF NOT EXISTS cycle_no INTEGER DEFAULT 1;;