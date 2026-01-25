CREATE TABLE request (
    request_id VARCHAR(50) PRIMARY KEY,
    customer_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (status IN ('New',
    'InProgress',
    'Completed',
    'Cancelled')),
    notes TEXT
);