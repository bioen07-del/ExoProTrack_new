CREATE TABLE request_line (
    request_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) NOT NULL,
    finished_product_code VARCHAR(50) NOT NULL,
    pack_format_code VARCHAR(50) NOT NULL,
    qty_units INTEGER NOT NULL,
    additional_qc_required BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);