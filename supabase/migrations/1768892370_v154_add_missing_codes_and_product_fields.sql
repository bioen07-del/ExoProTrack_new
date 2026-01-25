-- Migration: v154_add_missing_codes_and_product_fields
-- Created at: 1768892370

-- Add unique code to cm_process_method
ALTER TABLE public.cm_process_method ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- Add unique code to media_compatibility_spec  
ALTER TABLE public.media_compatibility_spec ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- Add pack_format and COA/SDS fields to product
ALTER TABLE public.product ADD COLUMN IF NOT EXISTS default_pack_format_code VARCHAR(50);
ALTER TABLE public.product ADD COLUMN IF NOT EXISTS product_type_for_sale VARCHAR(100);
ALTER TABLE public.product ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.product ADD COLUMN IF NOT EXISTS mechanism_of_action TEXT;;