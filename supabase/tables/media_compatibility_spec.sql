CREATE TABLE media_compatibility_spec (
    media_spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_medium_code VARCHAR(100) NOT NULL,
    phenol_red_flag BOOLEAN NOT NULL DEFAULT false,
    serum_class VARCHAR(20) NOT NULL CHECK (serum_class IN ('PRP',
    'FBS',
    'SerumFree',
    'Other')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);