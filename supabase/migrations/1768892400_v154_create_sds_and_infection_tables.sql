-- Migration: v154_create_sds_and_infection_tables
-- Created at: 1768892400

-- SDS Component table (for individual media components)
CREATE TABLE IF NOT EXISTS public.sds_component (
    sds_component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_name VARCHAR(255) NOT NULL,
    cas_number VARCHAR(50),
    -- Section 1: Identification
    product_identifier TEXT,
    supplier_details TEXT,
    emergency_phone VARCHAR(100),
    -- Section 2: Hazards
    hazard_classification TEXT,
    label_elements TEXT,
    other_hazards TEXT,
    -- Section 3: Composition
    composition_info TEXT,
    -- Section 4: First aid
    first_aid_measures TEXT,
    symptoms_effects TEXT,
    -- Section 5: Firefighting
    extinguishing_media TEXT,
    fire_hazards TEXT,
    -- Section 6: Accidental release
    personal_precautions TEXT,
    environmental_precautions TEXT,
    cleanup_methods TEXT,
    -- Section 7: Handling/storage
    safe_handling TEXT,
    storage_conditions TEXT,
    -- Section 8: Exposure controls
    exposure_limits TEXT,
    personal_protection TEXT,
    -- Section 9: Physical/chemical properties
    physical_state VARCHAR(50),
    color VARCHAR(100),
    odor VARCHAR(100),
    ph VARCHAR(50),
    melting_point VARCHAR(50),
    boiling_point VARCHAR(50),
    flash_point VARCHAR(50),
    other_properties JSONB,
    -- Section 10: Stability
    stability_info TEXT,
    incompatible_materials TEXT,
    decomposition_products TEXT,
    -- Section 11: Toxicological
    toxicological_info TEXT,
    -- Section 12: Ecological
    ecological_info TEXT,
    -- Section 13: Disposal
    disposal_methods TEXT,
    -- Section 14: Transport
    un_number VARCHAR(50),
    transport_class VARCHAR(50),
    packing_group VARCHAR(50),
    transport_info TEXT,
    -- Section 15: Regulatory
    regulatory_info TEXT,
    -- Section 16: Other
    revision_date DATE,
    other_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SDS Media table (linked to media_compatibility_spec)
CREATE TABLE IF NOT EXISTS public.sds_media (
    sds_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_spec_id UUID REFERENCES public.media_compatibility_spec(media_spec_id),
    sds_data JSONB, -- aggregated SDS from components
    custom_overrides JSONB, -- manual overrides
    revision_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Infection type reference table
CREATE TABLE IF NOT EXISTS public.infection_type (
    infection_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_method VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Infection test results
CREATE TABLE IF NOT EXISTS public.infection_test_result (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infection_type_id UUID REFERENCES public.infection_type(infection_type_id),
    entity_type VARCHAR(50) NOT NULL, -- 'donor', 'media', 'cm_lot'
    entity_id UUID NOT NULL,
    result VARCHAR(20) NOT NULL, -- 'negative', 'positive'
    test_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default infection types
INSERT INTO public.infection_type (code, name, description) VALUES
('HBsAg', 'HBsAg', 'Поверхностный антиген гепатита B'),
('Anti-HBc', 'Anti-HBc', 'Антитела к ядерному антигену гепатита B'),
('Anti-HCV', 'Anti-HCV', 'Антитела к вирусу гепатита C'),
('HIV-1/2', 'ВИЧ-1/2', 'Антитела к ВИЧ-1 и ВИЧ-2'),
('Syphilis', 'Сифилис', 'Антитела к бледной трепонеме'),
('CMV-IgM', 'Цитомегаловирус (IgM)', 'IgM антитела к цитомегаловирусу'),
('HSV-IgM', 'Герпес (IgM)', 'IgM антитела к вирусу простого герпеса'),
('Toxo-IgM', 'Токсоплазма (IgM)', 'IgM антитела к токсоплазме')
ON CONFLICT (code) DO NOTHING;;