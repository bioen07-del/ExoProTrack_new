-- Migration: add_modification_to_method_type_check
-- Created at: 1769165139

-- Drop old check constraint and add new one with Modification
ALTER TABLE cm_process_method DROP CONSTRAINT IF EXISTS cm_process_method_method_type_check;
ALTER TABLE cm_process_method ADD CONSTRAINT cm_process_method_method_type_check 
  CHECK (method_type IN ('Filtration', 'TFF', 'Diafiltration', 'Precipitation', 'Hold', 'Other', 'Modification'));;