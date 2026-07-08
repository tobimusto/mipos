-- Agregar columna promotions a la tabla store_settings con valor por defecto
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS promotions JSONB 
DEFAULT '[{"icon": "🔥", "title": "3+ productos · 10% OFF", "description": "Llevá 3 productos y obtené 10% OFF"}, {"icon": "🛒", "title": "$50.000+ · Envío gratis", "description": "Comprando más de $50.000"}]'::jsonb;
