CREATE TABLE shipment (
    shipment_id VARCHAR(50) PRIMARY KEY,
    pack_lot_id VARCHAR(50) NOT NULL,
    qty_shipped INTEGER NOT NULL,
    shipped_at TIMESTAMPTZ DEFAULT NOW(),
    shipped_by UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'Created' CHECK (status IN ('Created',
    'Shipped',
    'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);