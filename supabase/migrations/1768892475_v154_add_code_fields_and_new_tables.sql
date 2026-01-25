-- Migration: v154_add_code_fields_and_new_tables
-- Created at: 1768892475

-- Add code field to cm_process_method
ALTER TABLE cm_process_method ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- Add code field to media_compatibility_spec  
ALTER TABLE media_compatibility_spec ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- Add description to pack_format if not exists
ALTER TABLE pack_format ADD COLUMN IF NOT EXISTS description TEXT;

-- Add new fields to product
ALTER TABLE product ADD COLUMN IF NOT EXISTS default_pack_format_code VARCHAR(50);
ALTER TABLE product ADD COLUMN IF NOT EXISTS product_type_for_sale VARCHAR(100);
ALTER TABLE product ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE product ADD COLUMN IF NOT EXISTS mechanism_of_action TEXT;

-- Create infection_type table
CREATE TABLE IF NOT EXISTS infection_type (
    infection_code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_method VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default infection types
INSERT INTO infection_type (infection_code, name, description) VALUES
    ('HBsAg', 'HBsAg (Гепатит B)', 'Поверхностный антиген гепатита B'),
    ('Anti-HBc', 'Anti-HBc (Гепатит B core)', 'Антитела к ядерному антигену гепатита B'),
    ('Anti-HCV', 'Anti-HCV (Гепатит C)', 'Антитела к вирусу гепатита C'),
    ('HIV', 'ВИЧ-1/2', 'Антитела к ВИЧ-1 и ВИЧ-2'),
    ('Syphilis', 'Сифилис', 'Антитела к Treponema pallidum'),
    ('CMV', 'ЦМВ (Цитомегаловирус)', 'Антитела к цитомегаловирусу'),
    ('HSV', 'Герпес (HSV)', 'Антитела к вирусу простого герпеса'),
    ('Toxoplasma', 'Токсоплазма', 'Антитела к Toxoplasma gondii')
ON CONFLICT (infection_code) DO NOTHING;

-- Create infection_test_result table
CREATE TABLE IF NOT EXISTS infection_test_result (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cm_lot_id VARCHAR(50) NOT NULL,
    infection_code VARCHAR(50) NOT NULL REFERENCES infection_type(infection_code),
    result VARCHAR(20) NOT NULL CHECK (result IN ('Negative', 'Positive', 'Inconclusive')),
    tested_at DATE NOT NULL,
    tested_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sds_component table (16 sections)
CREATE TABLE IF NOT EXISTS sds_component (
    component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_number INTEGER NOT NULL CHECK (section_number BETWEEN 1 AND 16),
    section_title VARCHAR(255) NOT NULL,
    content_template TEXT,
    is_required BOOLEAN DEFAULT true,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SDS sections
INSERT INTO sds_component (section_number, section_title, sort_order) VALUES
    (1, 'Идентификация продукта', 1),
    (2, 'Идентификация опасностей', 2),
    (3, 'Состав/информация о компонентах', 3),
    (4, 'Меры первой помощи', 4),
    (5, 'Меры пожаротушения', 5),
    (6, 'Меры при случайном выбросе', 6),
    (7, 'Обращение и хранение', 7),
    (8, 'Контроль воздействия/средства защиты', 8),
    (9, 'Физические и химические свойства', 9),
    (10, 'Стабильность и реактивность', 10),
    (11, 'Токсикологическая информация', 11),
    (12, 'Экологическая информация', 12),
    (13, 'Утилизация', 13),
    (14, 'Транспортировка', 14),
    (15, 'Нормативная информация', 15),
    (16, 'Прочая информация', 16)
ON CONFLICT DO NOTHING;

-- Create sds_media table
CREATE TABLE IF NOT EXISTS sds_media (
    sds_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_spec_id UUID REFERENCES media_compatibility_spec(media_spec_id),
    component_id UUID REFERENCES sds_component(component_id),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);;