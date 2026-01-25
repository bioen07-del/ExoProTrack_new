-- Migration: add_modification_fields_to_cm_process_method
-- Created at: 1769164957

-- Add new columns for Modification type methods
ALTER TABLE cm_process_method 
ADD COLUMN IF NOT EXISTS steps_count integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS step_definitions jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS applicability varchar(20) DEFAULT NULL CHECK (applicability IN ('product', 'raw', 'both')),
ADD COLUMN IF NOT EXISTS trigger_stage varchar(50) DEFAULT NULL;

COMMENT ON COLUMN cm_process_method.steps_count IS 'Number of steps (only for Modification type)';
COMMENT ON COLUMN cm_process_method.step_definitions IS 'JSON array of {step_number, description, expected_results} (only for Modification type)';
COMMENT ON COLUMN cm_process_method.applicability IS 'Where method applies: product, raw, or both (only for Modification type)';
COMMENT ON COLUMN cm_process_method.trigger_stage IS 'BP stage to trigger the form (only for Modification type)';;