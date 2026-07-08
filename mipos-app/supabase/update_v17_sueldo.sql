-- Add sueldo column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sueldo NUMERIC DEFAULT 0;
