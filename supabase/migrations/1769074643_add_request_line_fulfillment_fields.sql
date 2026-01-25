-- Migration: add_request_line_fulfillment_fields
-- Created at: 1769074643

ALTER TABLE request_line ADD COLUMN IF NOT EXISTS qty_fulfilled INTEGER DEFAULT 0;
ALTER TABLE request_line ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Open';;