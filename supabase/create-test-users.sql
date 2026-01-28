-- =====================================================
-- СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ И НАСТРОЙКА ДОСТУПА
-- Выполните ВЕСЬ этот скрипт в Supabase SQL Editor
-- =====================================================

-- 1. Включаем расширение для генерации UUID и хэширования паролей
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Создаем тестовых пользователей в auth.users
DO $$
DECLARE
    admin_id UUID := gen_random_uuid();
    production_id UUID := gen_random_uuid();
    qc_id UUID := gen_random_uuid();
    qa_id UUID := gen_random_uuid();
    manager_id UUID := gen_random_uuid();
BEGIN
    -- Admin user
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
    VALUES (admin_id, '00000000-0000-0000-0000-000000000000', 'admin@exoprotrack.test', crypt('Admin123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated')
    ON CONFLICT (email) DO UPDATE SET encrypted_password = crypt('Admin123!', gen_salt('bf'));

    -- Production user
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
    VALUES (production_id, '00000000-0000-0000-0000-000000000000', 'production@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated')
    ON CONFLICT (email) DO UPDATE SET encrypted_password = crypt('Test123!', gen_salt('bf'));

    -- QC user
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
    VALUES (qc_id, '00000000-0000-0000-0000-000000000000', 'qc@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated')
    ON CONFLICT (email) DO UPDATE SET encrypted_password = crypt('Test123!', gen_salt('bf'));

    -- QA user
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
    VALUES (qa_id, '00000000-0000-0000-0000-000000000000', 'qa@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated')
    ON CONFLICT (email) DO UPDATE SET encrypted_password = crypt('Test123!', gen_salt('bf'));

    -- Manager user
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
    VALUES (manager_id, '00000000-0000-0000-0000-000000000000', 'manager@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated')
    ON CONFLICT (email) DO UPDATE SET encrypted_password = crypt('Test123!', gen_salt('bf'));

    RAISE NOTICE 'Пользователи auth.users созданы';
END $$;

-- 3. Создаем записи в app_user для тестовых пользователей
INSERT INTO public.app_user (auth_user_id, email, full_name, role, is_active)
SELECT id, email,
    CASE email
        WHEN 'admin@exoprotrack.test' THEN 'Администратор'
        WHEN 'production@exoprotrack.test' THEN 'Оператор производства'
        WHEN 'qc@exoprotrack.test' THEN 'Специалист QC'
        WHEN 'qa@exoprotrack.test' THEN 'Специалист QA'
        WHEN 'manager@exoprotrack.test' THEN 'Менеджер'
        ELSE 'User'
    END,
    CASE email
        WHEN 'admin@exoprotrack.test' THEN 'Admin'
        WHEN 'production@exoprotrack.test' THEN 'Production'
        WHEN 'qc@exoprotrack.test' THEN 'QC'
        WHEN 'qa@exoprotrack.test' THEN 'QA'
        WHEN 'manager@exoprotrack.test' THEN 'Manager'
        ELSE 'Production'
    END,
    true
FROM auth.users
WHERE email IN ('admin@exoprotrack.test', 'production@exoprotrack.test', 'qc@exoprotrack.test', 'qa@exoprotrack.test', 'manager@exoprotrack.test')
ON CONFLICT (auth_user_id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

-- 4. Настраиваем RLS политики для app_user
ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can read own profile" ON public.app_user;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.app_user;
DROP POLICY IF EXISTS "Service role full access" ON public.app_user;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.app_user;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.app_user;

-- Политика: авторизованные пользователи могут читать свой профиль
CREATE POLICY "Users can read own profile" ON public.app_user
    FOR SELECT
    USING (auth.uid() = auth_user_id);

-- Политика: авторизованные пользователи могут читать все профили (для отображения имён)
CREATE POLICY "Users can read all profiles" ON public.app_user
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Политика: вставка своего профиля
CREATE POLICY "Users can insert own profile" ON public.app_user
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

-- Политика: обновление своего профиля
CREATE POLICY "Users can update own profile" ON public.app_user
    FOR UPDATE
    USING (auth.uid() = auth_user_id);

-- 5. Даем права на таблицу
GRANT SELECT, INSERT, UPDATE ON public.app_user TO authenticated;
GRANT ALL ON public.app_user TO service_role;

-- 6. Проверяем результат
SELECT 'Тестовые пользователи:' AS info;
SELECT au.email, au.full_name, au.role, au.is_active
FROM public.app_user au
JOIN auth.users u ON au.auth_user_id = u.id
WHERE u.email LIKE '%@exoprotrack.test';
