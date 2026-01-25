CREATE TABLE pack_qa_release_decision (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id VARCHAR(50) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('Approved',
    'Rejected',
    'OnHold')),
    decided_at TIMESTAMPTZ DEFAULT NOW(),
    decided_by UUID,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);