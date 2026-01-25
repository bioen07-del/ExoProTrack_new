-- Migration: add_name_description_to_media_spec
-- Created at: 1768922995

ALTER TABLE media_compatibility_spec 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT;;