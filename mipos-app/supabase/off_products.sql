-- Crea la tabla para almacenar los productos de Open Food Facts localmente
CREATE TABLE IF NOT EXISTS public.off_products (
    barcode text PRIMARY KEY,
    product_name text,
    image_url text,
    brands text,
    country text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita RLS (Row Level Security) para mayor seguridad
ALTER TABLE public.off_products ENABLE ROW LEVEL SECURITY;

-- Permite lectura a todos los usuarios autenticados
CREATE POLICY "Allow authenticated read access" 
ON public.off_products 
FOR SELECT 
TO authenticated 
USING (true);

-- Permite lectura a usuarios anonimos (opcional, util si se busca sin loguear)
CREATE POLICY "Allow public read access" 
ON public.off_products 
FOR SELECT 
TO anon 
USING (true);

-- Crea un índice para búsquedas ultra rápidas por código de barras
CREATE INDEX IF NOT EXISTS off_products_barcode_idx ON public.off_products (barcode);

-- Crea un índice Full-Text Search para que la búsqueda por nombre sea muy rápida y soporte similitud
ALTER TABLE public.off_products ADD COLUMN fts tsvector GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(product_name, ''))) STORED;
CREATE INDEX IF NOT EXISTS off_products_fts_idx ON public.off_products USING GIN (fts);
