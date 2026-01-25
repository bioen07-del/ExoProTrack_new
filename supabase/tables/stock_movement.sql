CREATE TABLE stock_movement (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('Bulk',
    'Finished')),
    container_id UUID NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('In',
    'Out',
    'Adjust')),
    qty DECIMAL(10,2) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    moved_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);