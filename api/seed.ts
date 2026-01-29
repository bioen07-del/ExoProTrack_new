import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://bxffrqcnzvnwwekvpurt.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZmZycWNuenZud3dla3ZwdXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1NDM0MywiZXhwIjoyMDg0OTMwMzQzfQ.ylYIw3wtml2MqwhPUmiaKgn8ZgrTGbWjoHFOwAeSP8Q';

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
  const data = await res.json();
  return { status: res.status, data };
}

async function supabaseSQL(sql: string) {
  return supabaseAdmin('/rest/v1/rpc/exec_sql', {
    method: 'POST',
    body: JSON.stringify({ query: sql }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple protection - require secret key
  if (req.query.key !== 'exoprotrack2026') {
    return res.status(403).json({ error: 'Forbidden. Use ?key=exoprotrack2026' });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars' });
  }

  const results: any[] = [];

  // Step 1: Clean up existing test users via Admin API
  const { data: existingUsers } = await supabaseAdmin('/auth/v1/admin/users?per_page=50');

  if (existingUsers?.users) {
    for (const user of existingUsers.users) {
      if (user.email?.endsWith('@exoprotrack.test') || user.email?.endsWith('@exoprotrack.com')) {
        // Delete from app_user first
        await supabaseAdmin(`/rest/v1/app_user?auth_user_id=eq.${user.id}`, {
          method: 'DELETE',
        });
        // Delete auth user
        const del = await supabaseAdmin(`/auth/v1/admin/users/${user.id}`, {
          method: 'DELETE',
        });
        results.push({ action: 'deleted', email: user.email, status: del.status });
      }
    }
  }

  // Step 2: Create test users via Admin API (GoTrue creates proper records)
  const createdUsers: any[] = [];
  for (const user of TEST_USERS) {
    const created = await supabaseAdmin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name, role: user.role },
      }),
    });
    results.push({ action: 'created_auth', email: user.email, status: created.status, id: created.data?.id });
    if (created.data?.id) {
      createdUsers.push({ ...user, auth_id: created.data.id });
    }
  }

  // Step 3: Create app_user records via REST API
  for (const user of createdUsers) {
    const appUser = await supabaseAdmin('/rest/v1/app_user', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        auth_user_id: user.auth_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: true,
      }),
    });
    results.push({ action: 'created_app_user', email: user.email, status: appUser.status });
  }

  // Step 4: Verify - try to login with admin
  const loginTest = await supabaseAdmin('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY || SERVICE_ROLE_KEY },
    body: JSON.stringify({
      email: 'admin@exoprotrack.test',
      password: 'Admin123!',
    }),
  });
  results.push({ action: 'login_test', email: 'admin@exoprotrack.test', status: loginTest.status, success: loginTest.status === 200 });

  return res.status(200).json({
    message: 'Seed completed',
    login_works: loginTest.status === 200,
    results,
  });
}
