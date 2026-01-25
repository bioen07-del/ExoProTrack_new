CREATE TABLE product (
    product_code VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('BaseBulk',
    'Finished')),
    allowed_cell_types JSONB,
    media_spec_id UUID,
    shelf_life_days_default INTEGER DEFAULT 365,
    additional_qc_allowed BOOLEAN DEFAULT false,
    additional_qc_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);