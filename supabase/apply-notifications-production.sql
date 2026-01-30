-- =====================================================
-- APPLY TO PRODUCTION: Notifications System
-- Project: bxffrqcnzvnwwekvpurt
-- Run in: Supabase Dashboard > SQL Editor
-- =====================================================
-- Этот файл объединяет миграцию создания таблиц + исправленные RLS политики
-- Безопасен для повторного применения (IF NOT EXISTS, OR REPLACE, DROP IF EXISTS)
-- =====================================================

-- 1. Создание таблицы уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'request_created',
    'request_status_changed',
    'cm_lot_qc_pending',
    'cm_lot_qc_completed',
    'cm_lot_qa_decision',
    'cm_lot_ready_for_filling',
    'pack_lot_qc_required',
    'expiry_warning',
    'reservation_confirmed',
    'general'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 2. Создание таблицы подписок на уведомления
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'push', 'email')),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type, channel)
);

CREATE INDEX IF NOT EXISTS idx_notif_subs_user ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_subs_type ON notification_subscriptions(notification_type, is_enabled);

-- 3. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если были
DROP POLICY IF EXISTS notifications_user_select ON notifications;
DROP POLICY IF EXISTS notifications_user_insert ON notifications;
DROP POLICY IF EXISTS notifications_user_update ON notifications;
DROP POLICY IF EXISTS notifications_user_delete ON notifications;
DROP POLICY IF EXISTS notifications_authenticated_insert ON notifications;
DROP POLICY IF EXISTS subs_user_select ON notification_subscriptions;
DROP POLICY IF EXISTS subs_user_insert ON notification_subscriptions;
DROP POLICY IF EXISTS subs_user_update ON notification_subscriptions;
DROP POLICY IF EXISTS subs_user_delete ON notification_subscriptions;

-- ИСПРАВЛЕННЫЕ RLS: через app_user.auth_user_id (не auth.uid() напрямую)
CREATE POLICY "notifications_user_select" ON notifications
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
  WITH CHECK (true);

CREATE POLICY "subs_user_select" ON notification_subscriptions
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
  USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));

-- 4. Realtime support
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 5. Вспомогательная функция
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id VARCHAR(100) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    notification_id, user_id, type, title, message, entity_type, entity_id, priority
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Функция массовой отметки прочитанных
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Триггеры (опционально — могут падать если таблицы отличаются)
-- Раскомментируйте если нужны автоматические уведомления

-- CREATE OR REPLACE FUNCTION notify_on_request_create()
-- RETURNS TRIGGER AS $$ ... $$ LANGUAGE plpgsql;

-- =====================================================
-- ГОТОВО! Таблицы notifications и notification_subscriptions созданы
-- с правильными RLS политиками через app_user.auth_user_id
-- =====================================================
