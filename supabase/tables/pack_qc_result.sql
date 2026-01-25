CREATE TABLE pack_qc_result (
    qc_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qc_request_id UUID NOT NULL,
    test_code VARCHAR(50) NOT NULL,
    result_value VARCHAR(255),
    unit VARCHAR(50),
    pass_fail VARCHAR(10) CHECK (pass_fail IN ('Pass',
    'Fail',
    'NA')),
    report_ref VARCHAR(255),
    tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);