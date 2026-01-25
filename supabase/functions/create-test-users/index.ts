Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const testUsers = [
      { email: 'admin@exoprotrack.test', password: 'Admin123!', role: 'Admin', full_name: 'Администратор' },
      { email: 'production@exoprotrack.test', password: 'Test123!', role: 'Production', full_name: 'Оператор Production' },
      { email: 'qc@exoprotrack.test', password: 'Test123!', role: 'QC', full_name: 'Специалист QC' },
      { email: 'qa@exoprotrack.test', password: 'Test123!', role: 'QA', full_name: 'Специалист QA' },
      { email: 'manager@exoprotrack.test', password: 'Test123!', role: 'Manager', full_name: 'Менеджер' },
    ];

    const results = [];

    for (const user of testUsers) {
      // Create auth user via Admin API
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          email_confirm: true,
        }),
      });

      const authData = await authRes.json();
      
      if (authData.id) {
        // Create app_user record
        const appUserRes = await fetch(`${supabaseUrl}/rest/v1/app_user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            auth_user_id: authData.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: true,
          }),
        });

        results.push({ email: user.email, role: user.role, status: 'created', auth_id: authData.id });
      } else {
        results.push({ email: user.email, status: 'error', error: authData.msg || authData.message || 'Unknown error' });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
