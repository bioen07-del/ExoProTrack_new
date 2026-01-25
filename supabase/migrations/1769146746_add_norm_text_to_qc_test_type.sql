-- Migration: add_norm_text_to_qc_test_type
-- Created at: 1769146746

ALTER TABLE qc_test_type ADD COLUMN IF NOT EXISTS norm_text VARCHAR(255);;