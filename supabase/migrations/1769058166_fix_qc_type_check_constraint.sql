-- Migration: fix_qc_type_check_constraint
-- Created at: 1769058166

ALTER TABLE cm_qc_request DROP CONSTRAINT cm_qc_request_qc_type_check;
ALTER TABLE cm_qc_request ADD CONSTRAINT cm_qc_request_qc_type_check CHECK (qc_type IN ('Release', 'Raw', 'Product'));;