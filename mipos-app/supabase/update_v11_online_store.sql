-- Agregar nuevas columnas a la tabla products para la Tienda Online
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS show_in_store BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
