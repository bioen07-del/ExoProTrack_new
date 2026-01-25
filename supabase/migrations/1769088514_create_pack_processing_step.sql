-- Migration: create_pack_processing_step
-- Created at: 1769088514

CREATE TABLE IF NOT EXISTS pack_processing_step (
  processing_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_lot_id VARCHAR(50) NOT NULL REFERENCES pack_lot(pack_lot_id),
  method_id VARCHAR(100) NOT NULL,
  method_name VARCHAR(255),
  step_order INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  performed_by UUID REFERENCES app_user(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);;