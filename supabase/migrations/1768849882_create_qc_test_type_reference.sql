-- Migration: create_qc_test_type_reference
-- Created at: 1768849882

-- Справочник типов QC тестов (единый для QC первичного и QC продукта)
CREATE TABLE IF NOT EXISTS qc_test_type (
  code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50),
  norm_min DECIMAL,
  norm_max DECIMAL,
  method VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заполнение справочника 8 тестами
INSERT INTO qc_test_type (code, name, description, unit, norm_min, norm_max, method) VALUES
('sterility', 'Sterility', 'Тест на стерильность', 'pass/fail', NULL, NULL, 'USP <71>'),
('lal', 'LAL', 'Тест на эндотоксины (LAL)', 'EU/mL', 0, 0.5, 'LAL Kinetic'),
('mycoplasma', 'Mycoplasma', 'Тест на микоплазму', 'pass/fail', NULL, NULL, 'PCR'),
('ph', 'pH', 'Измерение pH', 'pH', 7.2, 7.4, 'Potentiometric'),
('osmolality', 'Osmolality', 'Осмоляльность', 'mOsm/kg', 280, 320, 'Freezing point'),
('endotoxin', 'Endotoxin', 'Эндотоксин', 'EU/mL', 0, 0.25, 'Recombinant Factor C'),
('dls', 'DLS', 'Динамическое светорассеяние', 'nm', 30, 150, 'Dynamic Light Scattering'),
('nta', 'NTA', 'Анализ траекторий наночастиц', 'particles/mL', 1e8, 1e12, 'Nanoparticle Tracking Analysis')
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE qc_test_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qc_test_type_read" ON qc_test_type FOR SELECT USING (true);
CREATE POLICY "qc_test_type_admin" ON qc_test_type FOR ALL USING (true);;