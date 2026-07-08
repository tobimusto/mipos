-- Actualización V2: Perfil avanzado, Slug y Atributos de producto

-- 1. Agregar campos de perfil a la tienda
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Agregar campos avanzados a los productos
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unidades';

-- Nota: Si "slug" arroja un error porque los existentes son NULL,
-- podés actualizar primero con un string único como md5(random()::text) 
-- y luego setear UNIQUE. Pero como Supabase permite varios NULLs en UNIQUE, 
-- debería funcionar directo.
