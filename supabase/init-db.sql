-- ============================================
-- EXO ProTrack - Database Initialization
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Create user role type
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'Production',
        'QC',
        'QA',
        'Admin',
        'Manager'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Create app_user table
-- ============================================
CREATE TABLE IF NOT EXISTS app_user (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'Production',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON app_user
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON app_user
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Create test users
-- ============================================
INSERT INTO app_user (email, full_name, role, is_active)
VALUES 
    ('admin@exoprotrack.test', 'Admin User', 'Admin', TRUE),
    ('production@exoprotrack.test', 'Production User', 'Production', TRUE),
    ('qc@exoprotrack.test', 'QC User', 'QC', TRUE),
    ('qa@exoprotrack.test', 'QA User', 'QA', TRUE),
    ('manager@exoprotrack.test', 'Manager User', 'Manager', TRUE)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- ============================================
-- Show created users
-- ============================================
SELECT * FROM app_user ORDER BY role, email;

\echo ''
\echo '==========================================='
\echo 'Database initialized successfully!'
\echo '==========================================='
\echo ''
\echo 'Test users created:'
\echo '  admin@exoprotrack.test / Admin123!'
\echo '  production@exoprotrack.test / Test123!'
\echo '  qc@exoprotrack.test / Test123!'
\echo '  qa@exoprotrack.test / Test123!'
\echo '  manager@exoprotrack.test / Test123!'
\echo ''
\echo 'Note: These are app-level users. For full auth,'
\echo 'configure Supabase Authentication separately.'
