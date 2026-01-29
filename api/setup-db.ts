import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';

const DB_HOST = process.env.SUPABASE_DB_HOST || 'db.bxffrqcnzvnwwekvpurt.supabase.co';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || '6S7VG%Nw!i3E7Bk';
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PORT = 5432;

interface SetupStep {
  name: string;
  sql: string;
}

const SETUP_STEPS: SetupStep[] = [
  // ==================== 1. CREATE MISSING TABLES ====================
  {
    name: 'create_sds_component',
    sql: `CREATE TABLE IF NOT EXISTS public.sds_component (
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
    )`,
  },
  {
    name: 'create_infection_type',
    sql: `CREATE TABLE IF NOT EXISTS public.infection_type (
      infection_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      test_method TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_base_media',
    sql: `CREATE TABLE IF NOT EXISTS public.base_media (
      base_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      phenol_red_flag BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      sds_component_id UUID REFERENCES public.sds_component(sds_component_id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_media_additive',
    sql: `CREATE TABLE IF NOT EXISTS public.media_additive (
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
    )`,
  },
  {
    name: 'create_media_compatibility_spec',
    sql: `CREATE TABLE IF NOT EXISTS public.media_compatibility_spec (
      media_spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      description TEXT,
      base_medium_code TEXT,
      base_media_id UUID REFERENCES public.base_media(base_media_id),
      serum_class TEXT NOT NULL DEFAULT 'FBS',
      phenol_red_flag BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_media_spec_additives',
    sql: `CREATE TABLE IF NOT EXISTS public.media_spec_additives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      media_spec_id UUID REFERENCES public.media_compatibility_spec(media_spec_id),
      additive_id UUID REFERENCES public.media_additive(additive_id),
      concentration NUMERIC,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_cm_process_method',
    sql: `CREATE TABLE IF NOT EXISTS public.cm_process_method (
      method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      method_type TEXT NOT NULL,
      code TEXT,
      description TEXT,
      characteristics_json JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_qc_test_type',
    sql: `CREATE TABLE IF NOT EXISTS public.qc_test_type (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      method TEXT,
      unit TEXT,
      norm_min NUMERIC,
      norm_max NUMERIC,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_infection_test_result',
    sql: `CREATE TABLE IF NOT EXISTS public.infection_test_result (
      result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      infection_type_id UUID REFERENCES public.infection_type(infection_type_id),
      test_date DATE NOT NULL,
      result TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_collection_vessel_item',
    sql: `CREATE TABLE IF NOT EXISTS public.collection_vessel_item (
      vessel_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collection_id UUID NOT NULL,
      vessel_type TEXT NOT NULL,
      qty INTEGER DEFAULT 1,
      area_value NUMERIC,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_lyophilization_event',
    sql: `CREATE TABLE IF NOT EXISTS public.lyophilization_event (
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
    )`,
  },
  {
    name: 'create_pack_process_method',
    sql: `CREATE TABLE IF NOT EXISTS public.pack_process_method (
      method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      method_type TEXT NOT NULL,
      description TEXT,
      characteristics_json JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },
  {
    name: 'create_sds_media',
    sql: `CREATE TABLE IF NOT EXISTS public.sds_media (
      sds_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      media_spec_id UUID REFERENCES public.media_compatibility_spec(media_spec_id),
      sds_data JSONB,
      custom_overrides JSONB,
      revision_date TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  },

  // ==================== 2. FK CONSTRAINT ====================
  {
    name: 'add_fk_sds_component_media_spec',
    sql: `DO $$ BEGIN
      ALTER TABLE public.sds_component
        ADD CONSTRAINT sds_component_media_spec_id_fkey
        FOREIGN KEY (media_spec_id) REFERENCES public.media_compatibility_spec(media_spec_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`,
  },

  // ==================== 3. RLS POLICIES FOR ALL TABLES ====================
  {
    name: 'setup_rls_all_tables',
    sql: `DO $$
    DECLARE
      tbl TEXT;
    BEGIN
      FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- Drop old policies
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated select" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON public.%I', tbl);

        -- SELECT
        EXECUTE format('CREATE POLICY "Allow authenticated select" ON public.%I FOR SELECT TO authenticated USING (true)', tbl);

        -- INSERT
        EXECUTE format('CREATE POLICY "Allow authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', tbl);

        -- UPDATE
        EXECUTE format('CREATE POLICY "Allow authenticated update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl);

        -- DELETE
        EXECUTE format('CREATE POLICY "Allow authenticated delete" ON public.%I FOR DELETE TO authenticated USING (true)', tbl);

        -- Grant permissions
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
      END LOOP;
    END $$`,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple protection
  if (req.query.key !== 'exoprotrack2026') {
    return res.status(403).json({ error: 'Forbidden. Use ?key=exoprotrack2026' });
  }

  const action = (req.query.action as string) || 'setup';

  const sql = postgres({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
    ssl: 'require',
    connect_timeout: 15,
    idle_timeout: 10,
  });

  const results: Array<{ step: string; status: string; error?: string }> = [];

  try {
    if (action === 'check') {
      // Just check what tables exist
      const tables = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const rlsInfo = await sql`
        SELECT schemaname, tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;

      const policies = await sql`
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
      `;

      return res.status(200).json({
        action: 'check',
        tables: tables.map((t) => t.table_name),
        table_count: tables.length,
        rls: rlsInfo.map((r) => ({
          table: r.tablename,
          rls_enabled: r.rowsecurity,
        })),
        policies: policies.map((p) => ({
          table: p.tablename,
          policy: p.policyname,
        })),
      });
    }

    // Execute setup steps
    for (const step of SETUP_STEPS) {
      try {
        await sql.unsafe(step.sql);
        results.push({ step: step.name, status: 'ok' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ step: step.name, status: 'error', error: msg });
      }
    }

    // Verify: list all tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    // Verify: count RLS policies
    const policyCount = await sql`
      SELECT COUNT(*) as cnt FROM pg_policies WHERE schemaname = 'public'
    `;

    const errors = results.filter((r) => r.status === 'error');

    return res.status(200).json({
      success: errors.length === 0,
      action: 'setup',
      tables: tables.map((t) => t.table_name),
      table_count: tables.length,
      policy_count: Number(policyCount[0]?.cnt || 0),
      steps_total: results.length,
      steps_ok: results.filter((r) => r.status === 'ok').length,
      steps_error: errors.length,
      results,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({
      success: false,
      error: msg,
      results,
    });
  } finally {
    await sql.end();
  }
}
