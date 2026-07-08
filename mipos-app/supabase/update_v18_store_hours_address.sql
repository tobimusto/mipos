-- Add store address to store_settings (hours come from existing business_hours column)
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS store_address TEXT;
