-- Миграция: Добавление системы уведомлений
-- Версия: 3.4.0
-- Дата: 2026-01-24

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

-- Индексы для быстрого поиска
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
  
  CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES app_user(user_id),
  UNIQUE(user_id, notification_type, channel)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notif_subs_user ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_subs_type ON notification_subscriptions(notification_type, is_enabled);

-- 3. Функция для создания уведомлений (используется в триггерах)
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
    notification_id,
    user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    priority
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    CASE p_type
      WHEN 'cm_lot_qc_pending', 'cm_lot_qa_decision', 'pack_lot_qc_required', 'expiry_warning' THEN 'urgent'
      WHEN 'request_created', 'request_status_changed', 'cm_lot_ready_for_filling', 'reservation_confirmed' THEN 'normal'
      ELSE 'low'
    END
  )
  RETURNING notification_id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Триггер для уведомлений при создании заявки
CREATE OR REPLACE FUNCTION notify_on_request_create()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Уведомляем Production о новой заявке
  SELECT create_notification(
    au.user_id,
    'request_created',
    'Новая заявка',
    'Создана заявка ' || NEW.request_id || ' на продукт ' || COALESCE(NEW.product_code, 'не указан'),
    'request',
    NEW.request_id
  )
  INTO v_notification_id
  FROM app_user au
  WHERE au.role = 'Production' AND au.is_active = TRUE
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_request_create_notify ON request;
CREATE TRIGGER trigger_request_create_notify
  AFTER INSERT ON request
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_request_create();

-- 5. Триггер для уведомлений при изменении статуса заявки
CREATE OR REPLACE FUNCTION notify_on_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Уведомляем Manager и Production
    SELECT create_notification(
      au.user_id,
      'request_status_changed',
      'Изменение статуса заявки',
      'Заявка ' || NEW.request_id || ' изменила статус: ' || OLD.status || ' → ' || NEW.status,
      'request',
      NEW.request_id
    )
    INTO v_notification_id
    FROM app_user au
    WHERE au.role IN ('Manager', 'Production') 
      AND au.is_active = TRUE
      AND au.user_id != CURRENT_USER; -- Не уведомлять того, кто изменил
    
    -- Пропускаем если нет пользователей
    IF v_notification_id IS NULL THEN
      -- Попробуем без условия пользователя
      SELECT create_notification(
        (SELECT user_id FROM app_user WHERE role = 'Manager' AND is_active = TRUE LIMIT 1),
        'request_status_changed',
        'Изменение статуса заявки',
        'Заявка ' || NEW.request_id || ' изменила статус: ' || OLD.status || ' → ' || NEW.status,
        'request',
        NEW.request_id
      )
      INTO v_notification_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_request_status_notify ON request;
CREATE TRIGGER trigger_request_status_notify
  AFTER UPDATE ON request
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_on_request_status_change();

-- 6. Триггер для уведомлений при передаче CM лота на QC
CREATE OR REPLACE FUNCTION notify_on_cm_lot_qc_pending()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  IF NEW.status = 'QC_Pending' THEN
    SELECT create_notification(
      au.user_id,
      'cm_lot_qc_pending',
      'CM лот готов к QC',
      'CM лот ' || NEW.cm_lot_id || ' передан на контроль качества',
      'cm_lot',
      NEW.cm_lot_id
    )
    INTO v_notification_id
    FROM app_user au
    WHERE au.role = 'QC' AND au.is_active = TRUE
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cm_lot_qc_notify ON cm_lot;
CREATE TRIGGER trigger_cm_lot_qc_notify
  AFTER UPDATE ON cm_lot
  FOR EACH ROW
  WHEN (NEW.status = 'QC_Pending' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_on_cm_lot_qc_pending();

-- 7. Триггер для уведомлений при решении QA
CREATE OR REPLACE FUNCTION notify_on_qa_decision()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_id UUID;
  v_title VARCHAR(255);
BEGIN
  v_title := CASE NEW.decision
    WHEN 'Approved' THEN 'CM лот одобрен QA'
    WHEN 'Rejected' THEN 'CM лот отклонен QA'
    ELSE 'CM лот на удержании'
  END;
  
  -- Уведомляем Production и Manager
  SELECT create_notification(
    au.user_id,
    'cm_lot_qa_decision',
    v_title,
    'По CM лоту ' || NEW.cm_lot_id || ' принято решение: ' || NEW.decision || COALESCE('. Причина: ' || NEW.reason, ''),
    'cm_lot',
    NEW.cm_lot_id
  )
  INTO v_notification_id
  FROM app_user au
  WHERE au.role IN ('Production', 'Manager') 
    AND au.is_active = TRUE
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qa_decision_notify ON cm_qa_release_decision;
CREATE TRIGGER trigger_qa_decision_notify
  AFTER INSERT ON cm_qa_release_decision
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_qa_decision();

-- 8. Функция для проверки и уведомления об истекающих сроках
CREATE OR REPLACE FUNCTION check_expiry_warnings()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_id UUID;
  v_days_until INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'cm_qa_release_decision' AND NEW.decision = 'Approved' THEN
    v_days_until := NEW.shelf_life_days - (NEW.qa_release_date::date - CURRENT_DATE);
    
    IF v_days_until <= 30 THEN
      SELECT create_notification(
        au.user_id,
        'expiry_warning',
        'Скоро истекает срок годности',
        'CM лот ' || NEW.cm_lot_id || ' истекает через ' || v_days_until || ' дней (' || NEW.expiry_date || ')',
        'cm_lot',
        NEW.cm_lot_id
      )
      INTO v_notification_id
      FROM app_user au
      WHERE au.role IN ('Manager', 'Production') 
        AND au.is_active = TRUE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expiry_warning ON cm_qa_release_decision;
CREATE TRIGGER trigger_expiry_warning
  AFTER INSERT ON cm_qa_release_decision
  FOR EACH ROW
  WHEN (NEW.decision = 'Approved')
  EXECUTE FUNCTION check_expiry_warnings();

-- 9. RLS политики для безопасности
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Политики для notifications
CREATE POLICY IF NOT EXISTS notifications_user_select ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS notifications_user_insert ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS notifications_user_update ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS notifications_user_delete ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Политики для notification_subscriptions
CREATE POLICY IF NOT EXISTS subs_user_select ON notification_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS subs_user_insert ON notification_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS subs_user_update ON notification_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS subs_user_delete ON notification_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- 10. Функция для массовой отметки прочитанных
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

-- 11. Представление для удобного просмотра уведомлений
CREATE OR REPLACE VIEW user_notifications_summary AS
SELECT 
  n.user_id,
  COUNT(*) FILTER (WHERE NOT n.is_read) AS unread_count,
  COUNT(*) FILTER (
    WHERE n.created_at >= NOW() - INTERVAL '24 hours'
  ) AS last_24h_count,
  COUNT(*) FILTER (
    WHERE n.created_at >= NOW() - INTERVAL '7 days'
  ) AS last_7d_count,
  MAX(n.created_at) AS last_notification_at
FROM notifications n
GROUP BY n.user_id;

-- Комментарии к таблицам
COMMENT ON TABLE notifications IS 'Таблица уведомлений пользователей';
COMMENT ON TABLE notification_subscriptions IS 'Подписки пользователей на типы уведомлений';
COMMENT ON COLUMN notifications.priority IS 'Приоритет: urgent (срочный), normal (обычный), low (низкий)';
COMMENT ON COLUMN notifications.entity_type IS 'Тип связанной сущности: cm_lot, request, pack_lot, reservation';
