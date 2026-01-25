-- Migration: add_partial_fulfillment_fields
-- Created at: 1769074383

-- Добавляем поля для отслеживания частичного исполнения
ALTER TABLE request_line 
ADD COLUMN IF NOT EXISTS qty_fulfilled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS partial_status VARCHAR(50) DEFAULT 'pending';

-- Добавляем поля для связи заявок
ALTER TABLE request 
ADD COLUMN IF NOT EXISTS parent_request_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS completion_note TEXT;

-- Комментарии
COMMENT ON COLUMN request_line.qty_fulfilled IS 'Фактически выполненное количество';
COMMENT ON COLUMN request_line.partial_status IS 'pending, partial, complete';
COMMENT ON COLUMN request.parent_request_id IS 'ID родительской заявки при создании на остаток';;