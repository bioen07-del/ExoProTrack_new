CREATE TABLE pack_qc_request (
    qc_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id VARCHAR(50) NOT NULL,
    qc_type VARCHAR(20) NOT NULL DEFAULT 'Additional' CHECK (qc_type IN ('Additional')),
    checkpoint_code VARCHAR(50) NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    requested_by UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'Opened' CHECK (status IN ('Opened',
    'InProgress',
    'Completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);