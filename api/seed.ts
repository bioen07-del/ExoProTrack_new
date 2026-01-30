import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SEED_API_SECRET = process.env.SEED_API_SECRET || '';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || '';

const TEST_USERS = [
  { email: 'admin@exoprotrack.test', password: 'Admin123!', role: 'Admin', full_name: 'Администратор' },
  { email: 'production@exoprotrack.test', password: 'Test123!', role: 'Production', full_name: 'Оператор производства' },
  { email: 'qc@exoprotrack.test', password: 'Test123!', role: 'QC', full_name: 'Специалист QC' },
  { email: 'qa@exoprotrack.test', password: 'Test123!', role: 'QA', full_name: 'Специалист QA' },
  { email: 'manager@exoprotrack.test', password: 'Test123!', role: 'Manager', full_name: 'Менеджер' },
];

async function supabaseAdmin(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// Execute SQL via multiple fallback methods
async function execSQL(query: string): Promise<{ method: string; status: number; data: any }> {
  // Method 1: pg-meta /pg/query endpoint
  try {
    const r1 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'x-connection-encrypted': '1',
      },
      body: JSON.stringify({ query }),
    });
    const d1text = await r1.text();
    let d1: any;
    try { d1 = JSON.parse(d1text); } catch { d1 = d1text; }
    if (r1.status < 400) {
      return { method: 'pg-meta', status: r1.status, data: d1 };
    }
  } catch (e: any) {
    // silently try next method
  }

  // Method 2: RPC function exec_sql (if exists)
  try {
    const r2 = await supabaseAdmin('/rest/v1/rpc/exec_sql', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    if (r2.status < 400) {
      return { method: 'rpc-exec_sql', status: r2.status, data: r2.data };
    }
  } catch (e: any) {
    // silently try next method
  }

  // Method 3: Direct pg-meta alternative paths
  for (const path of ['/pg-meta/default/query', '/database/query']) {
    try {
      const r = await fetch(`${SUPABASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ query }),
      });
      const dt = await r.text();
      let d: any;
      try { d = JSON.parse(dt); } catch { d = dt; }
      if (r.status < 400) {
        return { method: `endpoint:${path}`, status: r.status, data: d };
      }
    } catch {
      // try next
    }
  }

  return { method: 'none', status: 0, data: 'All SQL execution methods failed' };
}

// ==================== TABLE CREATION SQL ====================
const TABLE_SQLS = [
  `CREATE TABLE IF NOT EXISTS public.sds_component (
    sds_component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_name TEXT NOT NULL, cas_number TEXT, product_identifier TEXT,
    supplier_details TEXT, hazard_classification TEXT, label_elements TEXT,
    other_hazards TEXT, composition_info TEXT, first_aid_measures TEXT,
    extinguishing_media TEXT, fire_hazards TEXT, personal_precautions TEXT,
    environmental_precautions TEXT, cleanup_methods TEXT, safe_handling TEXT,
    storage_conditions TEXT, exposure_limits TEXT, personal_protection TEXT,
    physical_state TEXT, color TEXT, odor TEXT, ph TEXT,
    melting_point TEXT, boiling_point TEXT, flash_point TEXT,
    stability_info TEXT, incompatible_materials TEXT, decomposition_products TEXT,
    toxicological_info TEXT, symptoms_effects TEXT, ecological_info TEXT,
    disposal_methods TEXT, transport_info TEXT, un_number TEXT,
    transport_class TEXT, packing_group TEXT, regulatory_info TEXT,
    revision_date TEXT, emergency_phone TEXT, other_info TEXT,
    other_properties JSONB, media_spec_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.infection_type (
    infection_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
    test_method TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.base_media (
    base_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
    phenol_red_flag BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true,
    sds_component_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.media_additive (
    additive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
    additive_type TEXT, default_concentration NUMERIC, unit TEXT,
    is_active BOOLEAN DEFAULT true, sds_component_id UUID, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.media_compatibility_spec (
    media_spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT, description TEXT, base_medium_code TEXT, base_media_id UUID,
    serum_class TEXT NOT NULL DEFAULT 'FBS', phenol_red_flag BOOLEAN DEFAULT false,
    notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.media_spec_additives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_spec_id UUID, additive_id UUID, concentration NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.cm_process_method (
    method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, method_type TEXT NOT NULL, code TEXT,
    description TEXT, characteristics_json JSONB,
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.qc_test_type (
    code TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    method TEXT, unit TEXT, norm_min NUMERIC, norm_max NUMERIC,
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.infection_test_result (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, infection_type_id UUID,
    test_date DATE NOT NULL, result TEXT NOT NULL, notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.collection_vessel_item (
    vessel_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL, vessel_type TEXT NOT NULL,
    qty INTEGER DEFAULT 1, area_value NUMERIC, created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.lyophilization_event (
    lyophilization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_lot_id TEXT NOT NULL, vial_count INTEGER NOT NULL, program_name TEXT,
    freezing_temp_c NUMERIC, primary_drying_temp_c NUMERIC,
    primary_drying_pressure_mbar NUMERIC, secondary_drying_temp_c NUMERIC,
    duration_hours NUMERIC, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
    performed_by TEXT, status TEXT DEFAULT 'Pending', notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.pack_process_method (
    method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, method_type TEXT NOT NULL, description TEXT,
    characteristics_json JSONB, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.sds_media (
    sds_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_spec_id UUID, sds_data JSONB, custom_overrides JSONB,
    revision_date TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
];

const FK_SQLS = [
  `DO $$ BEGIN ALTER TABLE public.base_media ADD CONSTRAINT base_media_sds_component_fkey FOREIGN KEY (sds_component_id) REFERENCES public.sds_component(sds_component_id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE public.media_additive ADD CONSTRAINT media_additive_sds_component_fkey FOREIGN KEY (sds_component_id) REFERENCES public.sds_component(sds_component_id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE public.sds_component ADD CONSTRAINT sds_component_media_spec_fkey FOREIGN KEY (media_spec_id) REFERENCES public.media_compatibility_spec(media_spec_id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$`,
];

const RLS_SQL = `DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated select" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated select" ON public.%I FOR SELECT TO authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Allow authenticated delete" ON public.%I FOR DELETE TO authenticated USING (true)', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
  END LOOP;
END $$`;

// ==================== AUTH HELPER ====================
function extractBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

function authError(res: VercelResponse) {
  return res.status(401).json({
    type: 'error',
    error: {
      type: 'authentication_error',
      message: 'Please carry the API secret key in the \'Authorization\' field of the request header as Bearer token.',
    },
  });
}

function configError(res: VercelResponse, missing: string[]) {
  return res.status(500).json({
    type: 'error',
    error: {
      type: 'configuration_error',
      message: `Missing required environment variables: ${missing.join(', ')}. Configure them in Vercel project settings.`,
    },
  });
}

// ==================== HANDLER ====================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check required env vars
  const missingVars: string[] = [];
  if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
  if (!SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!SEED_API_SECRET) missingVars.push('SEED_API_SECRET');
  if (missingVars.length > 0) {
    return configError(res, missingVars);
  }

  // Auth: Accept both Authorization header (Bearer token) and legacy ?key= query param
  const bearerToken = extractBearerToken(req);
  const queryKey = req.query.key as string | undefined;

  if (bearerToken !== SEED_API_SECRET && queryKey !== SEED_API_SECRET) {
    return authError(res);
  }

  const action = (req.query.action as string) || 'seed';

  // ==================== ACTION: SETUP (create tables + RLS) ====================
  if (action === 'setup') {
    const results: any[] = [];

    // First, test if SQL execution works at all
    const testResult = await execSQL('SELECT current_database(), current_user, version()');
    results.push({ step: 'test_connection', ...testResult });

    if (testResult.method === 'none') {
      return res.status(200).json({
        success: false,
        message: 'No SQL execution method available. Please run the SQL manually in Supabase SQL Editor.',
        sql_methods_tried: ['pg-meta /pg/query', 'rpc exec_sql', 'pg-meta alternative paths'],
        manual_sql_url: `https://supabase.com/dashboard/project/${SUPABASE_URL.replace('https://', '').split('.')[0]}/sql`,
        results,
      });
    }

    // Create tables
    for (let i = 0; i < TABLE_SQLS.length; i++) {
      const r = await execSQL(TABLE_SQLS[i]);
      results.push({ step: `create_table_${i + 1}`, method: r.method, status: r.status });
    }

    // Add FK constraints
    for (let i = 0; i < FK_SQLS.length; i++) {
      const r = await execSQL(FK_SQLS[i]);
      results.push({ step: `fk_${i + 1}`, method: r.method, status: r.status });
    }

    // Setup RLS
    const rlsResult = await execSQL(RLS_SQL);
    results.push({ step: 'rls_setup', method: rlsResult.method, status: rlsResult.status });

    // Notify PostgREST to reload schema cache
    await supabaseAdmin('/rest/v1/', { method: 'GET' });

    // Verify tables
    const verifyResult = await execSQL(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
    );

    return res.status(200).json({
      success: true,
      action: 'setup',
      sql_method_used: testResult.method,
      tables: verifyResult.data,
      results,
    });
  }

  // ==================== ACTION: CHECK ====================
  if (action === 'check') {
    const testResult = await execSQL(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
    );
    const rlsResult = await execSQL(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const polResult = await execSQL(
      `SELECT COUNT(*) as cnt FROM pg_policies WHERE schemaname = 'public'`
    );

    return res.status(200).json({
      action: 'check',
      sql_method: testResult.method,
      tables: testResult.data,
      rls: rlsResult.data,
      policy_count: polResult.data,
    });
  }

  // ==================== DEFAULT ACTION: SEED (create test users) ====================
  const results: any[] = [];

  // Step 1: Clean up existing test users
  const { data: existingUsers } = await supabaseAdmin('/auth/v1/admin/users?per_page=50');
  if (existingUsers?.users) {
    for (const user of existingUsers.users) {
      if (user.email?.endsWith('@exoprotrack.test') || user.email?.endsWith('@exoprotrack.com')) {
        await supabaseAdmin(`/rest/v1/app_user?auth_user_id=eq.${user.id}`, { method: 'DELETE' });
        const del = await supabaseAdmin(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' });
        results.push({ action: 'deleted', email: user.email, status: del.status });
      }
    }
  }

  // Step 2: Create test users via Admin API
  const createdUsers: any[] = [];
  for (const user of TEST_USERS) {
    const created = await supabaseAdmin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email, password: user.password, email_confirm: true,
        user_metadata: { full_name: user.full_name, role: user.role },
      }),
    });
    results.push({ action: 'created_auth', email: user.email, status: created.status, id: created.data?.id });
    if (created.data?.id) createdUsers.push({ ...user, auth_id: created.data.id });
  }

  // Step 3: Create app_user records
  for (const user of createdUsers) {
    const appUser = await supabaseAdmin('/rest/v1/app_user', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        auth_user_id: user.auth_id, email: user.email,
        full_name: user.full_name, role: user.role, is_active: true,
      }),
    });
    results.push({ action: 'created_app_user', email: user.email, status: appUser.status });
  }

  // Step 4: Verify login
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const loginTest = await supabaseAdmin('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: anonKey ? { 'apikey': anonKey } : {},
    body: JSON.stringify({ email: 'admin@exoprotrack.test', password: 'Admin123!' }),
  });
  results.push({ action: 'login_test', status: loginTest.status, success: loginTest.status === 200 });

  return res.status(200).json({
    message: 'Seed completed',
    login_works: loginTest.status === 200,
    results,
  });
}
