-- Migration: extend_request_table_v150
-- Created at: 1768846996

-- Расширение таблицы request для резервации и требований
ALTER TABLE request 
ADD COLUMN IF NOT EXISTS reserved_cm_lot_id UUID REFERENCES cm_lot(id),
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES product(id),
ADD COLUMN IF NOT EXISTS postprocess_methods JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS postprocess_qc JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS extra_primary_qc JSONB DEFAULT '[]';;