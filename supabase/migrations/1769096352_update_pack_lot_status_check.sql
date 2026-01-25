-- Migration: update_pack_lot_status_check
-- Created at: 1769096352

ALTER TABLE pack_lot DROP CONSTRAINT pack_lot_status_check;
ALTER TABLE pack_lot ADD CONSTRAINT pack_lot_status_check CHECK (status IN ('Planned', 'Filling', 'Processing', 'QC_Pending', 'QA_Pending', 'Lyophilizing', 'Packed', 'Additional_QC_Pending', 'Released', 'Rejected', 'Shipped'));;