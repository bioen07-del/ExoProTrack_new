-- Migration: add_pack_lot_foreign_keys
-- Created at: 1769094098

-- Add foreign keys to pack_lot for Supabase join support
ALTER TABLE pack_lot 
ADD CONSTRAINT fk_pack_lot_source_cm_lot 
FOREIGN KEY (source_cm_lot_id) REFERENCES cm_lot(cm_lot_id) ON DELETE SET NULL;

ALTER TABLE pack_lot 
ADD CONSTRAINT fk_pack_lot_request_line 
FOREIGN KEY (request_line_id) REFERENCES request_line(request_line_id) ON DELETE SET NULL;

ALTER TABLE pack_lot 
ADD CONSTRAINT fk_pack_lot_pack_format 
FOREIGN KEY (pack_format_code) REFERENCES pack_format(pack_format_code) ON DELETE SET NULL;;