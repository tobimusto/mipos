-- Supabase Schema para mipos MVP

-- 1. Crear tabla de productos
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    icon TEXT,
    code TEXT
);

-- Insertar productos de prueba (mock)
INSERT INTO public.products (name, price, stock, icon, code) VALUES
    ('Coca Cola 2.25L', 1900, 24, '🥤', '7790895000997'),
    ('Alfajor Havanna', 1200, 15, '🍫', '7790895001000'),
    ('Agua Mineral 1.5L', 800, 40, '💧', '7790895001001'),
    ('Red Bull 250ml', 2800, 12, '⚡', '7790895001002'),
    ('Lays Clásicas 90g', 1500, 18, '🥔', '7790895001003'),
    ('Cerveza Quilmes 1L', 2100, 30, '🍺', '7790895001004');

-- 2. Crear tabla de ventas
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total NUMERIC NOT NULL,
    payment_method TEXT NOT NULL -- 'cash' o 'mp'
);

-- 3. Crear tabla de items de venta (detalle)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    qty INTEGER NOT NULL,
    price NUMERIC NOT NULL
);

-- Configurar RLS (Row Level Security)
-- Para el MVP permitimos lectura/escritura pública temporalmente
-- En fase 3 (Autenticación) restringiremos esto por usuario/comercio
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acceso publico a productos" ON public.products FOR ALL USING (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acceso publico a ventas" ON public.sales FOR ALL USING (true);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acceso publico a items de venta" ON public.sale_items FOR ALL USING (true);
