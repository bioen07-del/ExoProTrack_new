-- =====================================================
-- СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ + RLS ДЛЯ ВСЕХ ТАБЛИЦ
-- Выполните в Supabase SQL Editor ОДИН РАЗ
-- =====================================================

-- 1. СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ

-- sds_component
CREATE TABLE IF NOT EXISTS public.sds_component (
    sds_component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_name TEXT NOT NULL,
    cas_number TEXT,
    product_identifier TEXT,
    supplier_details TEXT,
    hazard_classification TEXT,
    label_elements TEXT,
    other_hazards TEXT,
    composition_info TEXT,
    first_aid_measures TEXT,
    extinguishing_media TEXT,
    fire_hazards TEXT,
    personal_precautions TEXT,
    environmental_precautions TEXT,
    cleanup_methods TEXT,
    safe_handling TEXT,
    storage_conditions TEXT,
    exposure_limits TEXT,
    personal_protection TEXT,
    physical_state TEXT,
    color TEXT,
    odor TEXT,
    ph TEXT,
    melting_point TEXT,
    boiling_point TEXT,
    flash_point TEXT,
    stability_info TEXT,
    incompatible_materials TEXT,
    decomposition_products TEXT,
    toxicological_info TEXT,
    symptoms_effects TEXT,
    ecological_info TEXT,
    disposal_methods TEXT,
    transport_info TEXT,
    un_number TEXT,
    transport_class TEXT,
    packing_group TEXT,
    regulatory_info TEXT,
    revision_date TEXT,
    emergency_phone TEXT,
    other_info TEXT,
    other_properties JSONB,
    media_spec_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- infection_type
CREATE TABLE IF NOT EXISTS public.infection_type (
    infection_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    test_method TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- base_media
CREATE TABLE IF NOT EXISTS public.base_media (
    base_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    phenol_red_flag BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sds_component_id UUID REFERENCES public.sds_component(sds_component_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- media_additive
CREATE TABLE IF NOT EXISTS public.media_additive (
    additive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    additive_type TEXT,
    default_concentration NUMERIC,
    unit TEXT,
    is_active BOOLEAN DEFAULT true,
    sds_component_id UUID REFERENCES public.sds_component(sds_component_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- media_compatibility_spec
CREATE TABLE IF NOT EXISTS public.media_compatibility_spec (
    media_spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    base_medium_code TEXT,
    base_media_id UUID REFERENCES public.base_media(base_media_id),
    serum_class TEXT NOT NULL DEFAULT 'FBS',
    phenol_red_flag BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- media_spec_additives
CREATE TABLE IF NOT EXISTS public.media_spec_additives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_spec_id UUID REFERENCES public.media_compatibility_spec(media_spec_id),
    additive_id UUID REFERENCES public.media_additive(additive_id),
    concentration NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cm_process_method
CREATE TABLE IF NOT EXISTS public.cm_process_method (
    method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    method_type TEXT NOT NULL,
    code TEXT,
    description TEXT,
    characteristics_json JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- qc_test_type
CREATE TABLE IF NOT EXISTS public.qc_test_type (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    method TEXT,
    unit TEXT,
    norm_min NUMERIC,
    norm_max NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Другие возможно отсутствующие таблицы
CREATE TABLE IF NOT EXISTS public.infection_test_result (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    infection_type_id UUID REFERENCES public.infection_type(infection_type_id),
    test_date DATE NOT NULL,
    result TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collection_vessel_item (
    vessel_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    vessel_type TEXT NOT NULL,
    qty INTEGER DEFAULT 1,
    area_value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lyophilization_event (
    lyophilization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id TEXT NOT NULL,
    vial_count INTEGER NOT NULL,
    program_name TEXT,
    freezing_temp_c NUMERIC,
    primary_drying_temp_c NUMERIC,
    primary_drying_pressure_mbar NUMERIC,
    secondary_drying_temp_c NUMERIC,
    duration_hours NUMERIC,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    performed_by TEXT,
    status TEXT DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pack_process_method (
    method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    method_type TEXT NOT NULL,
    description TEXT,
    characteristics_json JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sds_media (
    sds_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_spec_id UUID REFERENCES public.media_compatibility_spec(media_spec_id),
    sds_data JSONB,
    custom_overrides JSONB,
    revision_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавить FK для sds_component -> media_compatibility_spec если таблица уже существовала
DO $$ BEGIN
    ALTER TABLE public.sds_component
        ADD CONSTRAINT sds_component_media_spec_id_fkey
        FOREIGN KEY (media_spec_id) REFERENCES public.media_compatibility_spec(media_spec_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. RLS ПОЛИТИКИ ДЛЯ ВСЕХ ТАБЛИЦ
-- =====================================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Включаем RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- Удаляем старые политики если есть
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated select" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON public.%I', tbl);

        -- SELECT для авторизованных
        EXECUTE format('CREATE POLICY "Allow authenticated select" ON public.%I FOR SELECT TO authenticated USING (true)', tbl);

        -- INSERT для авторизованных
        EXECUTE format('CREATE POLICY "Allow authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', tbl);

        -- UPDATE для авторизованных
        EXECUTE format('CREATE POLICY "Allow authenticated update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl);

        -- DELETE для авторизованных
        EXECUTE format('CREATE POLICY "Allow authenticated delete" ON public.%I FOR DELETE TO authenticated USING (true)', tbl);

        -- Даём права
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);

        RAISE NOTICE 'RLS configured for: %', tbl;
    END LOOP;
END $$;

-- =====================================================
-- 3. ПРОВЕРКА
-- =====================================================
SELECT 'Все таблицы:' AS info;
SELECT table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS columns
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
