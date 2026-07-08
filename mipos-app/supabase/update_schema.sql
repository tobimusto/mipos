-- Fase 3: Multi-tenant & Security Update

-- 1. Asegurar que la extensión uuid-ossp esté activa (por si acaso)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Agregar user_id a las tablas existentes
-- Se asocia con auth.users de Supabase
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Crear tabla de Clientes (opcional para el POS)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document TEXT
);

-- 4. Actualizar las Políticas de Seguridad (RLS)
-- Borrar las políticas públicas temporales de la Fase 2
DROP POLICY IF EXISTS "Permitir acceso publico a productos" ON public.products;
DROP POLICY IF EXISTS "Permitir acceso publico a ventas" ON public.sales;
DROP POLICY IF EXISTS "Permitir acceso publico a items de venta" ON public.sale_items;

-- Crear políticas estrictas por usuario (Multi-tenant)
-- Productos
CREATE POLICY "Usuarios solo ven sus propios productos" ON public.products
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden insertar sus propios productos" ON public.products
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden actualizar sus propios productos" ON public.products
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden borrar sus propios productos" ON public.products
    FOR DELETE USING (auth.uid() = user_id);

-- Ventas
CREATE POLICY "Usuarios solo ven sus propias ventas" ON public.sales
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden insertar sus propias ventas" ON public.sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Items de Venta
CREATE POLICY "Usuarios solo ven sus propios items" ON public.sale_items
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden insertar sus propios items" ON public.sale_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Clientes
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios solo ven sus propios clientes" ON public.customers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden insertar sus clientes" ON public.customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios pueden actualizar sus clientes" ON public.customers
    FOR UPDATE USING (auth.uid() = user_id);
