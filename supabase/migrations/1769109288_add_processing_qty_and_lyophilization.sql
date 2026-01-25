-- Migration: add_processing_qty_and_lyophilization
-- Created at: 1769109288

-- Add qty tracking columns to pack_processing_step
ALTER TABLE pack_processing_step 
ADD COLUMN IF NOT EXISTS qty_input INTEGER,
ADD COLUMN IF NOT EXISTS qty_output INTEGER,
ADD COLUMN IF NOT EXISTS parameters_json JSONB;

-- Create lyophilization_event table
CREATE TABLE IF NOT EXISTS lyophilization_event (
  lyophilization_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_lot_id VARCHAR(50) NOT NULL,
  vial_count INTEGER NOT NULL,
  duration_hours DECIMAL(5,2),
  program_name VARCHAR(100),
  freezing_temp_c DECIMAL(5,1) DEFAULT -40,
  primary_drying_temp_c DECIMAL(5,1) DEFAULT -20,
  primary_drying_pressure_mbar DECIMAL(6,3) DEFAULT 0.1,
  secondary_drying_temp_c DECIMAL(5,1) DEFAULT 25,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  performed_by VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);;