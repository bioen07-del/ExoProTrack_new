import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://bxffrqcnzvnwwekvpurt.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZmZycWNuenZud3dla3ZwdXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1NDM0MywiZXhwIjoyMDg0OTMwMzQzfQ.ylYIw3wtml2MqwhPUmiaKgn8ZgrTGbWjoHFOwAeSP8Q';

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
    // Return error info for debugging
    return { method: 'pg-meta-error', status: r1.status, data: d1 };
  } catch (e: any) {
    return { method: 'pg-meta-exception', status: 0, data: e.message };
  }
}

// Migration SQL broken into individual statements
const MIGRATION_STEPS = [
  {
    name: 'create_notifications_table',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL CHECK (type IN (
        'request_created', 'request_status_changed', 'cm_lot_qc_pending',
        'cm_lot_qc_completed', 'cm_lot_qa_decision', 'cm_lot_ready_for_filling',
        'pack_lot_qc_required', 'expiry_warning', 'reservation_confirmed', 'general'
      )),
      title VARCHAR(255) NOT NULL,
      message TEXT,
      entity_type VARCHAR(50),
      entity_id VARCHAR(100),
      priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`
  },
  {
    name: 'create_notification_subscriptions_table',
    sql: `CREATE TABLE IF NOT EXISTS notification_subscriptions (
      subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
      notification_type VARCHAR(50) NOT NULL,
      channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'push', 'email')),
      is_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, notification_type, channel)
    )`
  },
  {
    name: 'create_indexes',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_unread') THEN
        CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_created_at') THEN
        CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_type') THEN
        CREATE INDEX idx_notifications_type ON notifications(type);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notif_subs_user') THEN
        CREATE INDEX idx_notif_subs_user ON notification_subscriptions(user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notif_subs_type') THEN
        CREATE INDEX idx_notif_subs_type ON notification_subscriptions(notification_type, is_enabled);
      END IF;
    END $$`
  },
  {
    name: 'enable_rls',
    sql: `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
          ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY`
  },
  {
    name: 'drop_old_policies',
    sql: `DO $$ BEGIN
      DROP POLICY IF EXISTS notifications_user_select ON notifications;
      DROP POLICY IF EXISTS notifications_user_insert ON notifications;
      DROP POLICY IF EXISTS notifications_user_update ON notifications;
      DROP POLICY IF EXISTS notifications_user_delete ON notifications;
      DROP POLICY IF EXISTS notifications_authenticated_insert ON notifications;
      DROP POLICY IF EXISTS "Allow authenticated select" ON notifications;
      DROP POLICY IF EXISTS "Allow authenticated insert" ON notifications;
      DROP POLICY IF EXISTS "Allow authenticated update" ON notifications;
      DROP POLICY IF EXISTS "Allow authenticated delete" ON notifications;
      DROP POLICY IF EXISTS subs_user_select ON notification_subscriptions;
      DROP POLICY IF EXISTS subs_user_insert ON notification_subscriptions;
      DROP POLICY IF EXISTS subs_user_update ON notification_subscriptions;
      DROP POLICY IF EXISTS subs_user_delete ON notification_subscriptions;
      DROP POLICY IF EXISTS "Allow authenticated select" ON notification_subscriptions;
      DROP POLICY IF EXISTS "Allow authenticated insert" ON notification_subscriptions;
      DROP POLICY IF EXISTS "Allow authenticated update" ON notification_subscriptions;
      DROP POLICY IF EXISTS "Allow authenticated delete" ON notification_subscriptions;
    END $$`
  },
  {
    name: 'create_notifications_policies',
    sql: `CREATE POLICY "notifications_user_select" ON notifications
            FOR SELECT TO authenticated
            USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));
          CREATE POLICY "notifications_user_update" ON notifications
            FOR UPDATE TO authenticated
            USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));
          CREATE POLICY "notifications_user_delete" ON notifications
            FOR DELETE TO authenticated
            USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));
          CREATE POLICY "notifications_authenticated_insert" ON notifications
            FOR INSERT TO authenticated
            WITH CHECK (true)`
  },
  {
    name: 'create_subscriptions_policies',
    sql: `CREATE POLICY "subs_user_select" ON notification_subscriptions
            FOR SELECT TO authenticated
            USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));
          CREATE POLICY "subs_user_insert" ON notification_subscriptions
            FOR INSERT TO authenticated
            WITH CHECK (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));
          CREATE POLICY "subs_user_update" ON notification_subscriptions
            FOR UPDATE TO authenticated
            USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));
          CREATE POLICY "subs_user_delete" ON notification_subscriptions
            FOR DELETE TO authenticated
            USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text))`
  },
  {
    name: 'grant_permissions',
    sql: `GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
          GRANT ALL ON notifications TO service_role;
          GRANT SELECT, INSERT, UPDATE, DELETE ON notification_subscriptions TO authenticated;
          GRANT ALL ON notification_subscriptions TO service_role`
  },
  {
    name: 'replica_identity',
    sql: `ALTER TABLE notifications REPLICA IDENTITY FULL`
  },
  {
    name: 'create_notification_function',
    sql: `CREATE OR REPLACE FUNCTION create_notification(
      p_user_id UUID, p_type VARCHAR(50), p_title VARCHAR(255),
      p_message TEXT DEFAULT NULL, p_entity_type VARCHAR(50) DEFAULT NULL,
      p_entity_id VARCHAR(100) DEFAULT NULL
    ) RETURNS UUID AS $$
    DECLARE v_notification_id UUID;
    BEGIN
      INSERT INTO notifications (
        notification_id, user_id, type, title, message, entity_type, entity_id, priority
      ) VALUES (
        gen_random_uuid(), p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id,
        CASE p_type
          WHEN 'cm_lot_qc_pending' THEN 'urgent'
          WHEN 'cm_lot_qa_decision' THEN 'urgent'
          WHEN 'pack_lot_qc_required' THEN 'urgent'
          WHEN 'expiry_warning' THEN 'urgent'
          WHEN 'request_created' THEN 'normal'
          WHEN 'request_status_changed' THEN 'normal'
          WHEN 'cm_lot_ready_for_filling' THEN 'normal'
          WHEN 'reservation_confirmed' THEN 'normal'
          ELSE 'low'
        END
      )
      RETURNING notification_id INTO v_notification_id;
      RETURN v_notification_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER`
  },
  {
    name: 'create_mark_read_function',
    sql: `CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
    RETURNS INTEGER AS $$
    DECLARE v_updated_count INTEGER;
    BEGIN
      UPDATE notifications SET is_read = TRUE, read_at = NOW()
      WHERE user_id = p_user_id AND is_read = FALSE;
      GET DIAGNOSTICS v_updated_count = ROW_COUNT;
      RETURN v_updated_count;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER`
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.key !== 'exoprotrack2026') {
    return res.status(403).json({ error: 'Forbidden. Use ?key=exoprotrack2026' });
  }

  const results: any[] = [];
  let allSuccess = true;

  // Test connection first
  const testResult = await execSQL('SELECT current_database(), current_user');
  results.push({ step: 'test_connection', ...testResult });

  if (testResult.status >= 400 || testResult.method.includes('error') || testResult.method.includes('exception')) {
    return res.status(200).json({
      success: false,
      message: 'Cannot connect to database via pg-meta. Try running SQL manually.',
      manual_url: 'https://supabase.com/dashboard/project/bxffrqcnzvnwwekvpurt/sql',
      results,
    });
  }

  // Execute each migration step
  for (const step of MIGRATION_STEPS) {
    const result = await execSQL(step.sql);
    const success = result.status < 400 && !result.method.includes('error');
    results.push({
      step: step.name,
      success,
      status: result.status,
      method: result.method,
      error: success ? undefined : result.data
    });
    if (!success) allSuccess = false;
  }

  // Verify
  const verifyResult = await execSQL(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('notifications', 'notification_subscriptions') ORDER BY table_name`
  );
  results.push({ step: 'verify_tables', ...verifyResult });

  // Notify PostgREST to reload cache
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
  } catch { /* ignore */ }

  return res.status(200).json({
    success: allSuccess,
    message: allSuccess ? 'Notifications migration applied successfully!' : 'Some steps failed. Check results.',
    results,
  });
}
