-- Migration: add_display_name_to_media_spec
-- Created at: 1769183176

ALTER TABLE media_compatibility_spec ADD COLUMN IF NOT EXISTS display_name VARCHAR(500);;