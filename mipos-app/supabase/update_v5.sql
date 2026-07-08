-- 1. Crear tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    telefono TEXT,
    cuit TEXT,
    email TEXT,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Vincular Productos con Proveedores
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL;

-- 3. Vincular Compras con Proveedores
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL;

-- 4. Agregar campos de recargo/descuento a configuraciones (store_settings)
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS card_surcharge NUMERIC DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS card_discount NUMERIC DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS transfer_surcharge NUMERIC DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS transfer_discount NUMERIC DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS cash_surcharge NUMERIC DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS cash_discount NUMERIC DEFAULT 0;

-- 5. Habilitar RLS para la tabla providers
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own providers" 
ON public.providers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own providers" 
ON public.providers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers" 
ON public.providers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers" 
ON public.providers FOR DELETE 
USING (auth.uid() = user_id);
