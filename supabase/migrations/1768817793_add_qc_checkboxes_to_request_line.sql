-- Migration: add_qc_checkboxes_to_request_line
-- Created at: 1768817793

ALTER TABLE request_line 
  ADD COLUMN IF NOT EXISTS sterility_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS lal_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS dls_required BOOLEAN DEFAULT true;;