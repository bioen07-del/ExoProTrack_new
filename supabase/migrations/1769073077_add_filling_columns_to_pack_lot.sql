-- Migration: add_filling_columns_to_pack_lot
-- Created at: 1769073077

-- Добавляем колонки для отслеживания розлива
ALTER TABLE pack_lot 
ADD COLUMN IF NOT EXISTS filling_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS filling_completed_at TIMESTAMPTZ;;