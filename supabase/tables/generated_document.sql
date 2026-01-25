CREATE TABLE generated_document (
    doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('COA',
    'SDS',
    'Micro')),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('CM_Lot',
    'PackLot')),
    entity_id VARCHAR(50) NOT NULL,
    template_version VARCHAR(50),
    snapshot_json JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);