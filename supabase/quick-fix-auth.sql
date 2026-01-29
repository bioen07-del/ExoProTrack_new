-- =====================================================
-- БЫСТРОЕ ИСПРАВЛЕНИЕ ОШИБКИ СОЗДАНИЯ ПОЛЬЗОВАТЕЛЕЙ
-- Скопируйте ВЕСЬ этот код и выполните в Supabase SQL Editor
-- =====================================================

-- Шаг 1: Удалить ВСЕ пользовательские триггеры на auth.users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' AND c.relname = 'users'
        AND NOT tgisinternal
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON auth.users CASCADE';
        RAISE NOTICE 'Удален триггер: %', r.tgname;
    END LOOP;
END $$;

-- Шаг 2: Удалить все проблемные функции
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.check_email() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile() CASCADE;
DROP FUNCTION IF EXISTS public.create_app_user() CASCADE;

-- Шаг 3: Проверяем что триггеров нет
SELECT 'Оставшиеся триггеры:' AS info;
SELECT tgname AS trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
AND NOT tgisinternal;

-- Готово! Теперь попробуйте создать пользователя в Dashboard
