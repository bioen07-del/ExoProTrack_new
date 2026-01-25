-- Migration: fix_infection_test_result_entity_id_type
-- Created at: 1769000140

ALTER TABLE infection_test_result ALTER COLUMN entity_id TYPE varchar USING entity_id::varchar;;