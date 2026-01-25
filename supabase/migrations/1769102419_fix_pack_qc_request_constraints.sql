-- Migration: fix_pack_qc_request_constraints
-- Created at: 1769102419

ALTER TABLE pack_qc_request DROP CONSTRAINT pack_qc_request_qc_type_check;
ALTER TABLE pack_qc_request ADD CONSTRAINT pack_qc_request_qc_type_check CHECK (qc_type IN ('Additional', 'ProductQC', 'Pending'));

ALTER TABLE pack_qc_request DROP CONSTRAINT pack_qc_request_status_check;
ALTER TABLE pack_qc_request ADD CONSTRAINT pack_qc_request_status_check CHECK (status IN ('Pending', 'Opened', 'InProgress', 'Completed'));;