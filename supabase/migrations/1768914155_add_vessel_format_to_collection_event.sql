-- Migration: add_vessel_format_to_collection_event
-- Created at: 1768914155

ALTER TABLE collection_event 
ADD COLUMN IF NOT EXISTS vessel_format_id TEXT REFERENCES pack_format(pack_format_code);;