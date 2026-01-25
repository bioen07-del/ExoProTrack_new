CREATE TABLE cm_qa_release_decision (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id VARCHAR(50) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('Approved',
    'Rejected',
    'OnHold')),
    decided_at TIMESTAMPTZ DEFAULT NOW(),
    decided_by UUID,
    reason TEXT,
    shelf_life_days INTEGER NOT NULL,
    qa_release_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);