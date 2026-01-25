-- Migration: add_frozen_spec_columns
-- Created at: 1769017926

-- Добавляем frozen_spec для хранения полной спецификации

-- В product: актуальный snapshot для отображения в формах создания
ALTER TABLE product ADD COLUMN IF NOT EXISTS frozen_spec JSONB;

-- В request: копия на момент создания заявки (защита архива)
ALTER TABLE request ADD COLUMN IF NOT EXISTS frozen_spec JSONB;

-- В cm_lot: копия на момент создания лота (защита архива)
ALTER TABLE cm_lot ADD COLUMN IF NOT EXISTS frozen_spec JSONB;

-- Комментарии для документации
COMMENT ON COLUMN product.frozen_spec IS 'Актуальный snapshot полной спецификации продукта (обновляется при редактировании)';
COMMENT ON COLUMN request.frozen_spec IS 'Snapshot спецификации на момент создания заявки (неизменный архив)';
COMMENT ON COLUMN cm_lot.frozen_spec IS 'Snapshot спецификации на момент создания лота (неизменный архив)';;