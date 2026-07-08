-- Actualización V3: Permitir decimales en cantidades (Venta por peso)

-- 1. Modificar la columna 'qty' en 'sale_items' para permitir decimales
ALTER TABLE public.sale_items 
ALTER COLUMN qty TYPE NUMERIC;

-- 2. Modificar la columna 'stock' en 'products' para permitir decimales (opcional pero recomendado si vendemos por peso)
ALTER TABLE public.products 
ALTER COLUMN stock TYPE NUMERIC;
