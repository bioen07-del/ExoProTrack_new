-- Migration: add_filling_statuses_to_cm_lot
-- Created at: 1769066333

ALTER TABLE cm_lot DROP CONSTRAINT cm_lot_status_check;
ALTER TABLE cm_lot ADD CONSTRAINT cm_lot_status_check CHECK (status IN ('Open', 'Closed_Collected', 'In_Processing', 'QC_Pending', 'QC_Completed', 'Approved', 'Rejected', 'OnHold', 'Consumed', 'Filling', 'Filled', 'Product_QC', 'Product_Released'));;