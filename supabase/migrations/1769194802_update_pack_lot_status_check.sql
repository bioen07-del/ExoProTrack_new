-- Migration: update_pack_lot_status_check
-- Created at: 1769194802

ALTER TABLE pack_lot DROP CONSTRAINT pack_lot_status_check;
ALTER TABLE pack_lot ADD CONSTRAINT pack_lot_status_check CHECK (status IN (
  'Planned', 'Processing', 'PreFill_QC_Pending', 'PreFill_QA_Pending',
  'Filling', 'Filled', 'PostProcessing', 'PostFill_QC_Pending', 'PostFill_QA_Pending',
  'QC_Pending', 'QA_Pending', 'QC_Completed', 'Lyophilizing',
  'Packed', 'Additional_QC_Pending', 'Released', 'Rejected', 'Shipped', 'PartiallyShipped'
));;