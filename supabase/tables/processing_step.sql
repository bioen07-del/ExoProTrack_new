CREATE TABLE processing_step (
    processing_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id VARCHAR(50) NOT NULL,
    method_id UUID NOT NULL,
    parameters_json JSONB,
    input_volume_ml DECIMAL(10,2),
    output_volume_ml DECIMAL(10,2),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    operator_user_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);