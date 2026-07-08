-- Agregar columnas para opcionales y recomendaciones
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommended UUID[] DEFAULT '{}'::uuid[];

-- Agregar columna para precios en diferentes monedas
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS prices JSONB DEFAULT NULL;

-- Agregar columna para historial de precios
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT NULL;

-- Agregar columna para dirección de tienda en store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS store_address TEXT DEFAULT NULL;

-- Agregar columna para instagram en store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT NULL;
