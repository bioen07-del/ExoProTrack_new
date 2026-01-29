-- ============================================
-- EXO ProTrack - Database Setup Script
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE lot_status AS ENUM (
        'draft', 'in_progress', 'qc_pending', 'qc_in_progress', 'qc_completed',
        'qa_pending', 'qa_in_progress', 'released', 'rejected', 'on_hold',
        'completed', 'filled', 'lyophilized', 'shipped'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM (
        'draft', 'pending_approval', 'approved', 'in_production',
        'qc_pending', 'completed', 'shipped', 'cancelled', 'on_hold'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Production', 'QC', 'QA', 'Admin', 'Manager');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- STEP 2: REFERENCE TABLES (no dependencies)
-- ============================================

CREATE TABLE IF NOT EXISTS cell_type (
    cell_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cm_process_method (
    cm_process_method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stage VARCHAR(50),
    unit VARCHAR(50),
    default_parameters JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_process_method (
    pack_process_method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stage VARCHAR(50),
    unit VARCHAR(50),
    default_parameters JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_format (
    pack_format_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    container_type VARCHAR(50),
    volume_ml DECIMAL(10, 2),
    units_per_pack INTEGER,
    pack_material VARCHAR(100),
    purpose VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS app_user (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'Production',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    product_type VARCHAR(50),
    storage_conditions VARCHAR(255),
    shelf_life_months INTEGER,
    packaging_format VARCHAR(100),
    concentration DECIMAL(10, 4),
    volume_ml DECIMAL(10, 2),
    unit VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS culture (
    culture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cell_type_id UUID REFERENCES cell_type(cell_type_id),
    passage_number INTEGER DEFAULT 0,
    freezing_date DATE,
    freezing_volume_ml DECIMAL(10, 2),
    initial_concentration DECIMAL(10, 2),
    viability_percent DECIMAL(5, 2),
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS container (
    container_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_code VARCHAR(100) NOT NULL UNIQUE,
    container_type VARCHAR(50) NOT NULL,
    nominal_volume_ml DECIMAL(10, 2) NOT NULL,
    current_volume_ml DECIMAL(10, 2),
    unit_of_measure VARCHAR(20) DEFAULT 'ml',
    storage_location VARCHAR(100),
    expiration_date DATE,
    status VARCHAR(20) DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_user(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    priority VARCHAR(20) DEFAULT 'normal',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    enabled_types TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 5: CM LOT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS cm_lot (
    cm_lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number VARCHAR(100) NOT NULL UNIQUE,
    culture_id UUID REFERENCES culture(culture_id),
    product_id UUID REFERENCES product(product_id),
    status lot_status DEFAULT 'draft',
    target_volume_ml DECIMAL(10, 2),
    actual_volume_ml DECIMAL(10, 2),
    target_concentration DECIMAL(10, 4),
    actual_concentration DECIMAL(10, 4),
    viability_percent DECIMAL(5, 2),
    passage_number INTEGER,
    processing_date DATE,
    responsible_person VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processing_step (
    processing_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id UUID REFERENCES cm_lot(cm_lot_id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_type VARCHAR(50),
    duration_minutes INTEGER,
    parameters JSONB DEFAULT '{}'::jsonb,
    operator VARCHAR(255),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cm_qc_request (
    qc_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id UUID REFERENCES cm_lot(cm_lot_id) ON DELETE CASCADE,
    test_type VARCHAR(100) NOT NULL,
    test_code VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    requested_by VARCHAR(255),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    norm_text TEXT
);

CREATE TABLE IF NOT EXISTS cm_qc_result (
    qc_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qc_request_id UUID REFERENCES cm_qc_request(qc_request_id) ON DELETE CASCADE,
    test_result VARCHAR(50) NOT NULL,
    test_value DECIMAL(10, 4),
    test_unit VARCHAR(50),
    specification_min DECIMAL(10, 4),
    specification_max DECIMAL(10, 4),
    result_status VARCHAR(20) NOT NULL,
    performed_by VARCHAR(255),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS cm_qa_release_decision (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id UUID REFERENCES cm_lot(cm_lot_id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL,
    decision_date TIMESTAMPTZ DEFAULT NOW(),
    decided_by VARCHAR(255) NOT NULL,
    justification TEXT,
    conditions TEXT,
    notes TEXT
);

-- ============================================
-- STEP 6: REQUEST TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS request (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(100) NOT NULL UNIQUE,
    request_type VARCHAR(20) NOT NULL,
    status request_status DEFAULT 'draft',
    product_id UUID REFERENCES product(product_id),
    customer_id VARCHAR(255),
    requested_by VARCHAR(255),
    requested_date DATE,
    required_date DATE,
    target_volume_ml DECIMAL(10, 2),
    target_concentration DECIMAL(10, 4),
    pack_format_id UUID REFERENCES pack_format(pack_format_id),
    filling_volume_ml DECIMAL(10, 2),
    lyophilization_required BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_line (
    request_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES request(request_id) ON DELETE CASCADE,
    product_id UUID REFERENCES product(product_id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'units',
    reserved_quantity DECIMAL(10, 2),
    fulfilled_quantity DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 7: PACK LOT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS pack_lot (
    pack_lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number VARCHAR(100) NOT NULL UNIQUE,
    cm_lot_id UUID REFERENCES cm_lot(cm_lot_id),
    product_id UUID REFERENCES product(product_id),
    pack_format_id UUID REFERENCES pack_format(pack_format_id),
    request_line_id UUID REFERENCES request_line(request_line_id),
    status lot_status DEFAULT 'draft',
    target_units INTEGER,
    actual_units INTEGER,
    filling_volume_ml DECIMAL(10, 2),
    lyophilization_cycles INTEGER,
    storage_location VARCHAR(100),
    expiration_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_processing_step (
    pack_processing_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id UUID REFERENCES pack_lot(pack_lot_id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    stage VARCHAR(50),
    unit VARCHAR(50),
    duration_minutes INTEGER,
    parameters JSONB DEFAULT '{}'::jsonb,
    operator VARCHAR(255),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_qc_request (
    pack_qc_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id UUID REFERENCES pack_lot(pack_lot_id) ON DELETE CASCADE,
    test_type VARCHAR(100) NOT NULL,
    test_code VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    requested_by VARCHAR(255),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    norm_text TEXT
);

CREATE TABLE IF NOT EXISTS pack_qc_result (
    pack_qc_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_qc_request_id UUID REFERENCES pack_qc_request(pack_qc_request_id) ON DELETE CASCADE,
    test_result VARCHAR(50) NOT NULL,
    test_value DECIMAL(10, 4),
    test_unit VARCHAR(50),
    specification_min DECIMAL(10, 4),
    specification_max DECIMAL(10, 4),
    result_status VARCHAR(20) NOT NULL,
    performed_by VARCHAR(255),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS pack_qa_release_decision (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id UUID REFERENCES pack_lot(pack_lot_id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL,
    decision_date TIMESTAMPTZ DEFAULT NOW(),
    decided_by VARCHAR(255) NOT NULL,
    justification TEXT,
    conditions TEXT,
    notes TEXT
);

-- ============================================
-- STEP 8: INVENTORY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS shipment (
    shipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES request(request_id),
    shipment_number VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    carrier VARCHAR(255),
    tracking_number VARCHAR(255),
    shipped_date DATE,
    delivered_date DATE,
    recipient_name VARCHAR(255),
    recipient_address TEXT,
    recipient_contact VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movement (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id UUID REFERENCES container(container_id),
    product_id UUID REFERENCES product(product_id),
    movement_type VARCHAR(50) NOT NULL,
    quantity_change DECIMAL(10, 2) NOT NULL,
    quantity_after DECIMAL(10, 2),
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 9: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cm_lot_lot_number ON cm_lot(lot_number);
CREATE INDEX IF NOT EXISTS idx_cm_lot_status ON cm_lot(status);
CREATE INDEX IF NOT EXISTS idx_request_request_number ON request(request_number);
CREATE INDEX IF NOT EXISTS idx_request_status ON request(status);
CREATE INDEX IF NOT EXISTS idx_pack_lot_lot_number ON pack_lot(lot_number);
CREATE INDEX IF NOT EXISTS idx_pack_lot_status ON pack_lot(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_culture_code ON culture(code);

-- ============================================
-- STEP 10: RLS POLICIES
-- ============================================

ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_qc_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_qc_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE request ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_processing_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_qc_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_qc_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_process_method ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_process_method ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_format ENABLE ROW LEVEL SECURITY;
ALTER TABLE container ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (simplified policy)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'app_user', 'notifications', 'culture', 'product', 'cm_lot',
            'processing_step', 'cm_qc_request', 'cm_qc_result', 'request',
            'request_line', 'pack_lot', 'pack_processing_step', 'pack_qc_request',
            'pack_qc_result', 'shipment', 'cell_type', 'cm_process_method',
            'pack_process_method', 'pack_format', 'container'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- ============================================
-- STEP 11: AUTO-CREATE USER ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_user (auth_user_id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'Production',
    TRUE
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 12: ENABLE REALTIME
-- ============================================

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- DONE!
-- ============================================

SELECT 'Database setup complete! Tables created: ' || count(*)::text
FROM pg_tables WHERE schemaname = 'public';
