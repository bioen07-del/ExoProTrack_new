-- Migration: add_purpose_to_pack_format
-- Created at: 1768990031

-- Добавляем поле предназначения в справочник упаковок
ALTER TABLE pack_format 
ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) DEFAULT 'product' 
CHECK (purpose IN ('raw', 'product'));

-- Обновляем существующие записи
UPDATE pack_format SET purpose = 'product' WHERE pack_format_code IN ('PNCLN-10', 'PNCLN-4');
UPDATE pack_format SET purpose = 'raw' WHERE pack_format_code = 'BULK-500';

-- Комментарий к полю
COMMENT ON COLUMN pack_format.purpose IS 'Предназначение упаковки: raw = для сырья, product = для продукта';;