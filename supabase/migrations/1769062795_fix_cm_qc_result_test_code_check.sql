-- Migration: fix_cm_qc_result_test_code_check
-- Created at: 1769062795

ALTER TABLE cm_qc_result DROP CONSTRAINT cm_qc_result_test_code_check;
ALTER TABLE cm_qc_result ADD CONSTRAINT cm_qc_result_test_code_check CHECK (test_code IN ('Sterility', 'LAL', 'DLS', 'sterility', 'lal', 'dls', 'DLS_conc', ' DLS_conc', 'nta', 'endotoxin', 'mycoplasma', 'ph', 'osmolality'));;