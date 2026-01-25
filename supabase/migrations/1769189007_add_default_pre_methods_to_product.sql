-- Migration: add_default_pre_methods_to_product
-- Created at: 1769189007

ALTER TABLE product ADD COLUMN IF NOT EXISTS default_pre_methods JSONB DEFAULT '[]'::jsonb;;