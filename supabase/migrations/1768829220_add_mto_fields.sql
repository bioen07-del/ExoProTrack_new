-- Migration: add_mto_fields
-- Created at: 1768829220

-- Add request_line_id to cm_lot for MTO binding
ALTER TABLE cm_lot ADD COLUMN IF NOT EXISTS request_line_id uuid REFERENCES request_line(request_line_id);

-- Add source_type to request_line
ALTER TABLE request_line ADD COLUMN IF NOT EXISTS source_type varchar(20) DEFAULT 'FromStock' CHECK (source_type IN ('FromStock', 'NewProduction'));;