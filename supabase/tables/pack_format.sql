CREATE TABLE pack_format (
    pack_format_code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nominal_fill_volume_ml DECIMAL(10,2) NOT NULL,
    container_type VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);