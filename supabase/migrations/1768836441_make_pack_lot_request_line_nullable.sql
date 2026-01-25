-- Migration: make_pack_lot_request_line_nullable
-- Created at: 1768836441

ALTER TABLE pack_lot ALTER COLUMN request_line_id DROP NOT NULL;;