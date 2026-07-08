-- Adds a column to save the user's preferred POS categories for quick access
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS pos_categories JSONB DEFAULT '[]'::jsonb;
