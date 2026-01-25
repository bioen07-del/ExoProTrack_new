-- Migration: add_shipment_details_columns
-- Created at: 1769108628

ALTER TABLE shipment 
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS waybill_number VARCHAR(100);;