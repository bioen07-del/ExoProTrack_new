-- Migration: add_notes_to_culture
-- Created at: 1769147680

ALTER TABLE culture ADD COLUMN IF NOT EXISTS notes TEXT;;