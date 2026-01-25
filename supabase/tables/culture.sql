CREATE TABLE culture (
    culture_id VARCHAR(100) PRIMARY KEY,
    cell_type_code VARCHAR(50) NOT NULL,
    tissue_list JSONB,
    donor_ref VARCHAR(255),
    culture_journal_ref VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'InWork' CHECK (status IN ('InWork',
    'Archived')),
    status_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);