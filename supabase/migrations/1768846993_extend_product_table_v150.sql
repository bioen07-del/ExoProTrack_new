-- Migration: extend_product_table_v150
-- Created at: 1768846993

-- Расширение таблицы product для стандартных требований
ALTER TABLE product 
ADD COLUMN IF NOT EXISTS media_spec_id UUID REFERENCES media_compatibility_spec(id),
ADD COLUMN IF NOT EXISTS default_primary_qc JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_postprocess_methods JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_product_qc JSONB DEFAULT '[]';;