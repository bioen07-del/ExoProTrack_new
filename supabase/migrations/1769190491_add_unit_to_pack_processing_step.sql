-- Migration: add_unit_to_pack_processing_step
-- Created at: 1769190491

ALTER TABLE pack_processing_step ADD COLUMN unit TEXT DEFAULT 'ml';
UPDATE pack_processing_step SET unit = 'ml' WHERE processing_stage = 'pre_filling';
UPDATE pack_processing_step SET unit = 'pcs' WHERE processing_stage = 'post_filling';;