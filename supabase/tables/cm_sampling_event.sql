CREATE TABLE cm_sampling_event (
    sampling_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id VARCHAR(50) NOT NULL,
    checkpoint_code VARCHAR(50) NOT NULL,
    sampled_at TIMESTAMPTZ DEFAULT NOW(),
    sample_volume_ml DECIMAL(10,2),
    operator_user_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);