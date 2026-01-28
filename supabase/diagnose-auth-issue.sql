-- =====================================================
-- ДИАГНОСТИКА ПРОБЛЕМЫ С СОЗДАНИЕМ ПОЛЬЗОВАТЕЛЕЙ
-- Выполните эти запросы в Supabase SQL Editor
-- =====================================================

-- 1. ПОКАЗАТЬ ВСЕ ТРИГГЕРЫ НА ТАБЛИЦЕ auth.users
SELECT
    tgname AS trigger_name,
    tgtype,
    proname AS function_name,
    tgenabled AS enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- 2. ПОКАЗАТЬ ВСЕ ФУНКЦИИ В СХЕМЕ public СВЯЗАННЫЕ С AUTH
SELECT
    proname AS function_name,
    prosrc AS function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (proname LIKE '%user%' OR proname LIKE '%auth%' OR proname LIKE '%email%');

-- 3. УДАЛИТЬ ВСЕ ТРИГГЕРЫ НА auth.users (ОСТОРОЖНО!)
-- Раскомментируйте и выполните если нужно удалить все триггеры
/*
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
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON auth.users';
        RAISE NOTICE 'Dropped trigger: %', r.tgname;
    END LOOP;
END $$;
*/

-- 4. ПРОВЕРИТЬ ЕСТЬ ЛИ ФУНКЦИЯ handle_new_user
SELECT
    proname,
    prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 5. УДАЛИТЬ ПРОБЛЕМНУЮ ФУНКЦИЮ (если существует)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 6. ПРОВЕРИТЬ СТРУКТУРУ ТАБЛИЦЫ app_user
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'app_user';

-- 7. ПРОВЕРИТЬ ЕСТЬ ЛИ CONSTRAINTS НА ТАБЛИЦЕ app_user
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.app_user'::regclass;

-- =====================================================
-- ПОЛНАЯ ОЧИСТКА И ПЕРЕСОЗДАНИЕ (ЕСЛИ НИЧЕГО НЕ ПОМОГЛО)
-- =====================================================

-- 8. УДАЛИТЬ ВСЕ ТРИГГЕРЫ И ПЕРЕСОЗДАТЬ ТАБЛИЦУ
/*
-- Удаляем все триггеры на auth.users
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
    END LOOP;
END $$;

-- Удаляем все функции связанные с созданием пользователей
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.check_email() CASCADE;

-- Пересоздаем таблицу app_user (ВНИМАНИЕ: удалит данные!)
DROP TABLE IF EXISTS public.app_user CASCADE;

CREATE TABLE public.app_user (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Отключаем RLS
ALTER TABLE public.app_user DISABLE ROW LEVEL SECURITY;

-- Даем права
GRANT ALL ON public.app_user TO authenticated;
GRANT ALL ON public.app_user TO service_role;
GRANT ALL ON public.app_user TO anon;
*/

-- =====================================================
-- АЛЬТЕРНАТИВА: СОЗДАТЬ ПРОСТОЙ ТРИГГЕР БЕЗ ПРОВЕРОК
-- =====================================================

-- 9. Создать безопасную функцию для создания профиля
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.app_user (id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Игнорируем ошибки чтобы не блокировать создание пользователя
    RETURN NEW;
END;
$$;

-- Создать триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
*/
