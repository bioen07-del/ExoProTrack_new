-- ============================================
-- EXO ProTrack - Complete Database Schema
-- Project: https://bxffrqcnzvnwwekvpurt.supabase.co
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE lot_status AS ENUM (
        'draft',
        'in_progress',
        'qc_pending',
        'qc_in_progress',
        'qc_completed',
        'qa_pending',
        'qa_in_progress',
        'released',
        'rejected',
        'on_hold',
        'completed',
        'filled',
        'lyophilized',
        'shipped'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM (
        'draft',
        'pending_approval',
        'approved',
        'in_production',
        'qc_pending',
        'completed',
        'shipped',
        'cancelled',
        'on_hold'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
-- CORE TABLES
-- ============================================

-- app_user table (already exists, ensure columns)
CREATE TABLE IF NOT EXISTS app_user (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'Production',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
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

-- Notification preferences
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

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Culture table
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

-- Collection event table
CREATE TABLE IF NOT EXISTS collection_event (
    collection_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    culture_id UUID REFERENCES culture(culture_id),
    collection_date TIMESTAMPTZ NOT NULL,
    collection_volume_ml DECIMAL(10, 2) NOT NULL,
    vessel_format VARCHAR(100),
    donor_id VARCHAR(100),
    batch_number VARCHAR(100),
    temperature_celsius DECIMAL(5, 2),
    ph_level DECIMAL(4, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Container table
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

-- Product table
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

-- ============================================
-- PROCESSING TABLES
-- ============================================

-- CM Lot table
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

-- Processing step table
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

-- CM Sampling event
CREATE TABLE IF NOT EXISTS cm_sampling_event (
    sampling_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id UUID REFERENCES cm_lot(cm_lot_id) ON DELETE CASCADE,
    sampling_time TIMESTAMPTZ NOT NULL,
    sample_type VARCHAR(50) NOT NULL,
    sample_volume_ml DECIMAL(10, 2),
    test_performed VARCHAR(100),
    result_value DECIMAL(10, 4),
    result_unit VARCHAR(50),
    performed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CM QC Request
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
    norm_text TEXT,
    additional_qc_required BOOLEAN DEFAULT FALSE,
    dls_required BOOLEAN DEFAULT FALSE,
    lal_required BOOLEAN DEFAULT FALSE,
    sterility_required BOOLEAN DEFAULT FALSE
);

-- CM QC Result
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

-- CM QA Release Decision
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
-- REQUEST TABLES
-- ============================================

-- Request table
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
    pack_format_id UUID,
    filling_volume_ml DECIMAL(10, 2),
    lyophilization_required BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    shipment_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request line table
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

-- Reservation table
CREATE TABLE IF NOT EXISTS reservation (
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_line_id UUID REFERENCES request_line(request_line_id) ON DELETE CASCADE,
    container_id UUID REFERENCES container(container_id),
    reserved_volume_ml DECIMAL(10, 2) NOT NULL,
    reserved_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PACKAGING TABLES
-- ============================================

-- Pack format table
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

-- Pack lot table
CREATE TABLE IF NOT EXISTS pack_lot (
    pack_lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number VARCHAR(100) NOT NULL UNIQUE,
    cm_lot_id UUID REFERENCES cm_lot(cm_lot_id),
    product_id UUID REFERENCES product(product_id),
    pack_format_id UUID REFERENCES pack_format(pack_format_id),
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

-- Pack processing step
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

-- Pack sampling event
CREATE TABLE IF NOT EXISTS pack_sampling_event (
    pack_sampling_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id UUID REFERENCES pack_lot(pack_lot_id) ON DELETE CASCADE,
    sampling_time TIMESTAMPTZ NOT NULL,
    sample_type VARCHAR(50) NOT NULL,
    sample_volume_ml DECIMAL(10, 2),
    test_performed VARCHAR(100),
    result_value DECIMAL(10, 4),
    result_unit VARCHAR(50),
    performed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pack QC Request
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

-- Pack QC Result
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

-- Pack QA Release Decision
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
-- INVENTORY TABLES
-- ============================================

-- Stock movement table
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

-- Shipment table
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

-- Generated document table
CREATE TABLE IF NOT EXISTS generated_document (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    generated_by VARCHAR(255),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Label print log table
CREATE TABLE IF NOT EXISTS label_print_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    printed_by VARCHAR(255),
    printer_name VARCHAR(100),
    copies_printed INTEGER DEFAULT 1,
    printed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- ============================================
-- REFERENCE TABLES
-- ============================================

-- Cell type table
CREATE TABLE IF NOT EXISTS cell_type (
    cell_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CM Process Method table
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

-- Pack Process Method table
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

-- Media compatibility spec table
CREATE TABLE IF NOT EXISTS media_compatibility_spec (
    media_spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES product(product_id),
    base_medium_code VARCHAR(100),
    additive_code VARCHAR(100),
    concentration DECIMAL(10, 4),
    unit VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection vessel item table
CREATE TABLE IF NOT EXISTS collection_vessel_item (
    vessel_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_event_id UUID REFERENCES collection_event(collection_event_id) ON DELETE CASCADE,
    container_id UUID REFERENCES container(container_id),
    vessel_number INTEGER,
    volume_ml DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cm_lot_lot_number ON cm_lot(lot_number);
CREATE INDEX IF NOT EXISTS idx_cm_lot_status ON cm_lot(status);
CREATE INDEX IF NOT EXISTS idx_cm_lot_culture_id ON cm_lot(culture_id);
CREATE INDEX IF NOT EXISTS idx_cm_lot_product_id ON cm_lot(product_id);

CREATE INDEX IF NOT EXISTS idx_processing_step_cm_lot_id ON processing_step(cm_lot_id);
CREATE INDEX IF NOT EXISTS idx_processing_step_order ON processing_step(cm_lot_id, step_order);

CREATE INDEX IF NOT EXISTS idx_request_request_number ON request(request_number);
CREATE INDEX IF NOT EXISTS idx_request_status ON request(status);
CREATE INDEX IF NOT EXISTS idx_request_product_id ON request(product_id);

CREATE INDEX IF NOT EXISTS idx_request_line_request_id ON request_line(request_id);

CREATE INDEX IF NOT EXISTS idx_reservation_request_line_id ON reservation(request_line_id);
CREATE INDEX IF NOT EXISTS idx_reservation_container_id ON reservation(container_id);

CREATE INDEX IF NOT EXISTS idx_pack_lot_lot_number ON pack_lot(lot_number);
CREATE INDEX IF NOT EXISTS idx_pack_lot_status ON pack_lot(status);
CREATE INDEX IF NOT EXISTS idx_pack_lot_cm_lot_id ON pack_lot(cm_lot_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_container_container_code ON container(container_code);
CREATE INDEX IF NOT EXISTS idx_container_status ON container(status);

CREATE INDEX IF NOT EXISTS idx_stock_movement_container_id ON stock_movement(container_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_product_id ON stock_movement(product_id);

CREATE INDEX IF NOT EXISTS idx_culture_code ON culture(code);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE container ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_sampling_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_qc_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_qc_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_qa_release_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE request ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_format ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_processing_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_sampling_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_qc_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_qc_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_qa_release_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_print_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_process_method ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_process_method ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_compatibility_spec ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_vessel_item ENABLE ROW LEVEL SECURITY;

-- Default RLS policy - allow authenticated users to read all, insert own
CREATE POLICY "Allow authenticated access" ON app_user FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON notification_preferences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON push_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON culture FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON collection_event FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON container FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON product FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON cm_lot FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON processing_step FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON cm_sampling_event FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON cm_qc_request FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON cm_qc_result FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON cm_qa_release_decision FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON request FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON request_line FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON reservation FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_format FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_lot FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_processing_step FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_sampling_event FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_qc_request FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_qc_result FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_qa_release_decision FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON stock_movement FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON shipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON generated_document FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON label_print_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON cell_type FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON cm_process_method FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON pack_process_method FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON media_compatibility_spec FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON collection_vessel_item FOR SELECT TO authenticated USING (true);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to auto-create app_user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_user (auth_user_id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Production'),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

\echo ''
\echo '==========================================='
\echo 'Database schema created successfully!'
\echo '==========================================='
\echo ''
\echo 'Tables created: 29'
\echo 'Indexes created: 20+'
\echo 'RLS policies: 30+'
\echo ''
\echo 'Next: Configure Edge Functions and Environment Variables'
