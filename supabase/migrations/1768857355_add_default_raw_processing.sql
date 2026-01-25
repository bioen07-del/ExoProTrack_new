-- Migration: add_default_raw_processing
-- Created at: 1768857355

ALTER TABLE product ADD COLUMN IF NOT EXISTS default_raw_processing JSONB DEFAULT '[]';;