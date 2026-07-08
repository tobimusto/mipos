-- ═══════════════════════════════════════
-- Catálogo Online - Schema Update
-- ═══════════════════════════════════════

-- 1. Tabla de configuraciones de la tienda
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_name TEXT,
    whatsapp_number TEXT,
    user_id UUID REFERENCES auth.users(id),
    promotions JSONB DEFAULT '[{"icon": "🔥", "title": "3+ productos · 10% OFF", "description": "Llevá 3 productos y obtené 10% OFF"}, {"icon": "🛒", "title": "$50.000+ · Envío gratis", "description": "Comprando más de $50.000"}]'::jsonb
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- El dueño puede leer/escribir su propia config
CREATE POLICY "Usuarios ven su propia config" ON public.store_settings
    FOR ALL USING (auth.uid() = user_id);

-- Cualquier persona puede LEER la config de una tienda (para la vista pública)
CREATE POLICY "Lectura publica de store_settings" ON public.store_settings
    FOR SELECT USING (true);

-- 2. Permitir lectura pública de PRODUCTOS para el catálogo público
-- (solo lectura, no escritura)
CREATE POLICY "Lectura publica de productos para catalogo" ON public.products
    FOR SELECT USING (true);

-- 3. Asociar el user_id del usuario actual a su store_settings al crearlo
-- (se hace desde el frontend al guardar la configuración)
