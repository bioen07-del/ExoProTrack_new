-- Миграция: Исправление RLS для таблиц уведомлений
-- Проблема: auth.uid() возвращает auth user UUID, а user_id в notifications — это app_user.user_id (TEXT)
-- Решение: Использовать подзапрос через app_user для связки auth.uid() с app_user.user_id

-- Удаляем старые политики (если существуют)
DROP POLICY IF EXISTS notifications_user_select ON notifications;
DROP POLICY IF EXISTS notifications_user_insert ON notifications;
DROP POLICY IF EXISTS notifications_user_update ON notifications;
DROP POLICY IF EXISTS notifications_user_delete ON notifications;
DROP POLICY IF EXISTS subs_user_select ON notification_subscriptions;
DROP POLICY IF EXISTS subs_user_insert ON notification_subscriptions;
DROP POLICY IF EXISTS subs_user_update ON notification_subscriptions;
DROP POLICY IF EXISTS subs_user_delete ON notification_subscriptions;

-- Новые RLS политики для notifications — через app_user.auth_user_id
CREATE POLICY "notifications_user_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));

CREATE POLICY "notifications_user_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));

CREATE POLICY "notifications_user_delete" ON notifications
  FOR DELETE TO authenticated
  USING (user_id IN (SELECT au.user_id FROM app_user au WHERE au.auth_user_id = auth.uid()::text));

-- INSERT: разрешаем вставку для authenticated (триггеры создают от имени system)
CREATE POLICY "notifications_authenticated_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Новые RLS политики для notification_subscriptions
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

-- Также обновим RLS для Realtime подписки (нужен SELECT для notifications через реалтайм)
ALTER TABLE notifications REPLICA IDENTITY FULL;
