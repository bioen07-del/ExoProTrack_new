CREATE TABLE collection_vessel_item (
    vessel_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    vessel_type VARCHAR(20) NOT NULL CHECK (vessel_type IN ('Dish',
    'Flask',
    'Other')),
    area_value DECIMAL(10,2),
    qty INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);