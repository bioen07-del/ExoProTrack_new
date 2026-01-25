-- Migration: v155_base_media_and_additives
-- Created at: 1768899179

-- Справочник базовых сред
CREATE TABLE IF NOT EXISTS public.base_media (
    base_media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phenol_red_flag BOOLEAN DEFAULT TRUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Справочник добавок
CREATE TABLE IF NOT EXISTS public.media_additive (
    additive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    default_concentration NUMERIC(10,4),
    unit VARCHAR(20) DEFAULT '%',
    additive_type VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Связь спецификации среды с добавками
CREATE TABLE IF NOT EXISTS public.media_spec_additives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_spec_id UUID REFERENCES public.media_compatibility_spec(media_spec_id) ON DELETE CASCADE,
    additive_id UUID REFERENCES public.media_additive(additive_id) ON DELETE CASCADE,
    concentration NUMERIC(10,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(media_spec_id, additive_id)
);

-- Добавить связь с base_media
ALTER TABLE public.media_compatibility_spec ADD COLUMN IF NOT EXISTS base_media_id UUID REFERENCES public.base_media(base_media_id);

-- Заполнить базовые среды
INSERT INTO public.base_media (code, name, phenol_red_flag, description) VALUES
('DMEM-HG', 'DMEM High Glucose', TRUE, 'DMEM с высоким содержанием глюкозы (4.5 g/L)'),
('DMEM-HG-NP', 'DMEM High Glucose без фенолового красного', FALSE, 'DMEM без фенолового красного'),
('DMEM-LG', 'DMEM Low Glucose', TRUE, 'DMEM с низким содержанием глюкозы (1.0 g/L)'),
('DMEM-LG-NP', 'DMEM Low Glucose без фенолового красного', FALSE, 'DMEM LG без фенолового красного'),
('IMDM', 'IMDM', TRUE, 'Iscove''s Modified Dulbecco''s Medium'),
('IMDM-NP', 'IMDM без фенолового красного', FALSE, 'IMDM без фенолового красного'),
('AMEM', 'α-MEM', TRUE, 'Alpha Minimum Essential Medium'),
('AMEM-NP', 'α-MEM без фенолового красного', FALSE, 'Alpha MEM без фенолового красного'),
('RPMI', 'RPMI 1640', TRUE, 'RPMI 1640 Medium'),
('RPMI-NP', 'RPMI 1640 без фенолового красного', FALSE, 'RPMI 1640 без фенолового красного')
ON CONFLICT (code) DO NOTHING;

-- Заполнить добавки
INSERT INTO public.media_additive (code, name, default_concentration, unit, additive_type, description) VALUES
('FBS', 'Фетальная бычья сыворотка (FBS)', 10, '%', 'serum', 'Fetal Bovine Serum'),
('PRP', 'Плазма, обогащённая тромбоцитами (PRP)', 5, '%', 'serum', 'Platelet Rich Plasma'),
('GLUT', 'Глутамин', 2, 'mM', 'supplement', 'L-Glutamine'),
('L-GLUT', 'L-Глутамин', 2, 'mM', 'supplement', 'L-Glutamine стабильный'),
('HEPES', 'HEPES', 25, 'mM', 'supplement', 'HEPES буфер'),
('PEN-STREP', 'Пенициллин/Стрептомицин', 1, '%', 'antibiotic', 'Pen 100 U/mL, Strep 100 µg/mL'),
('GENTAMICIN', 'Гентамицин', 50, 'µg/mL', 'antibiotic', 'Gentamicin sulfate')
ON CONFLICT (code) DO NOTHING;;