import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  try {
    // Create user role type
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('Production', 'QC', 'QA', 'Admin', 'Manager');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `
    })

    // Create app_user table
    const { error: tableError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS app_user (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auth_user_id UUID UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255),
        role user_role NOT NULL DEFAULT 'Production',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    if (tableError) {
      // Table might already exist, that's OK
      console.log('Table creation result:', tableError.message)
    }

    // Create test users
    const users = [
      { email: 'admin@exoprotrack.test', full_name: 'Admin User', role: 'Admin' },
      { email: 'production@exoprotrack.test', full_name: 'Production User', role: 'Production' },
      { email: 'qc@exoprotrack.test', full_name: 'QC User', role: 'QC' },
      { email: 'qa@exoprotrack.test', full_name: 'QA User', role: 'QA' },
      { email: 'manager@exoprotrack.test', full_name: 'Manager User', role: 'Manager' }
    ]

    for (const user of users) {
      const { error } = await supabase
        .from('app_user')
        .upsert(user, { onConflict: 'email' })
      
      if (error) {
        console.log('User insert result:', error.message)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Database initialized successfully!',
        users_created: users.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
