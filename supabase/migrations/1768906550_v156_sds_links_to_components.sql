-- Migration: v156_sds_links_to_components
-- Created at: 1768906550

-- Добавляем прямые ссылки на SDS в base_media и media_additive
ALTER TABLE base_media ADD COLUMN IF NOT EXISTS sds_component_id UUID REFERENCES sds_component(sds_component_id);
ALTER TABLE media_additive ADD COLUMN IF NOT EXISTS sds_component_id UUID REFERENCES sds_component(sds_component_id);;