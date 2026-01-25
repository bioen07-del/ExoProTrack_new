-- Migration: add_media_spec_to_sds_component
-- Created at: 1768893916

ALTER TABLE sds_component ADD COLUMN IF NOT EXISTS media_spec_id UUID REFERENCES media_compatibility_spec(media_spec_id);;