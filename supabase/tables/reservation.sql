CREATE TABLE reservation (
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id VARCHAR(50) NOT NULL,
    request_line_id UUID NOT NULL,
    reserved_volume_ml DECIMAL(10,2) NOT NULL,
    reserved_at TIMESTAMPTZ DEFAULT NOW(),
    reserved_by UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active',
    'Consumed',
    'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);