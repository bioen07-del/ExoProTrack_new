-- Migration: add_unit_to_cm_process_method
-- Created at: 1769190478

ALTER TABLE cm_process_method ADD COLUMN unit TEXT DEFAULT 'ml';
UPDATE cm_process_method SET unit = 'ml' WHERE stage = 'pre_filling';
UPDATE cm_process_method SET unit = 'pcs' WHERE stage = 'post_filling';;