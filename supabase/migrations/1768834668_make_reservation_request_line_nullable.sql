-- Migration: make_reservation_request_line_nullable
-- Created at: 1768834668

ALTER TABLE reservation ALTER COLUMN request_line_id DROP NOT NULL;;