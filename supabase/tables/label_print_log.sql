CREATE TABLE label_print_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('CM_Lot',
    'PackLot')),
    entity_id VARCHAR(50) NOT NULL,
    label_format VARCHAR(50),
    qty_printed INTEGER NOT NULL DEFAULT 1,
    printed_at TIMESTAMPTZ DEFAULT NOW(),
    printed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);