-- =====================================================
-- СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ И НАСТРОЙКА ДОСТУПА
-- Выполните ВЕСЬ этот скрипт в Supabase SQL Editor
-- =====================================================

-- 1. Включаем расширение для хэширования паролей
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Удаляем старых тестовых пользователей если есть
DELETE FROM public.app_user WHERE email LIKE '%@exoprotrack.test';
DELETE FROM auth.users WHERE email LIKE '%@exoprotrack.test';

-- 3. Создаем тестовых пользователей в auth.users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'admin@exoprotrack.test', crypt('Admin123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'production@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'qc@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'qa@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'manager@exoprotrack.test', crypt('Test123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', false, 'authenticated', 'authenticated');

-- 4. Создаем записи в app_user для тестовых пользователей
INSERT INTO public.app_user (auth_user_id, email, full_name, role, is_active)
SELECT id, email,
    CASE email
        WHEN 'admin@exoprotrack.test' THEN 'Администратор'
        WHEN 'production@exoprotrack.test' THEN 'Оператор производства'
        WHEN 'qc@exoprotrack.test' THEN 'Специалист QC'
        WHEN 'qa@exoprotrack.test' THEN 'Специалист QA'
        WHEN 'manager@exoprotrack.test' THEN 'Менеджер'
    END,
    CASE email
        WHEN 'admin@exoprotrack.test' THEN 'Admin'
        WHEN 'production@exoprotrack.test' THEN 'Production'
        WHEN 'qc@exoprotrack.test' THEN 'QC'
        WHEN 'qa@exoprotrack.test' THEN 'QA'
        WHEN 'manager@exoprotrack.test' THEN 'Manager'
    END,
    true
FROM auth.users
WHERE email LIKE '%@exoprotrack.test';

-- 5. Настраиваем RLS политики для app_user
ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can read own profile" ON public.app_user;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.app_user;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.app_user;
DROP POLICY IF EXISTS "Users can update own profile" ON public.app_user;
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.app_user;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.app_user;

-- Простая политика: авторизованные пользователи могут всё читать
CREATE POLICY "Enable read for authenticated" ON public.app_user
    FOR SELECT TO authenticated
    USING (true);

-- Политика: вставка профиля
CREATE POLICY "Enable insert for authenticated" ON public.app_user
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = auth_user_id);

-- 6. Даем права
GRANT SELECT, INSERT, UPDATE ON public.app_user TO authenticated;
GRANT ALL ON public.app_user TO service_role;

-- 7. Проверяем результат
SELECT 'Созданные пользователи:' AS info;
SELECT u.email, au.full_name, au.role
FROM auth.users u
LEFT JOIN public.app_user au ON u.id = au.auth_user_id
WHERE u.email LIKE '%@exoprotrack.test';
