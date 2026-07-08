-- 1. Aseguramos que la columna employee_id exista en la tabla purchases
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS employee_id UUID;

-- 2. Limpiar huérfanos (por si acaso, aunque si recién la creamos estará en NULL)
UPDATE public.purchases
SET employee_id = NULL
WHERE employee_id IS NOT NULL
  AND employee_id NOT IN (SELECT id FROM public.profiles);

-- 3. Agregar la clave foránea a profiles para mantener la integridad
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'purchases_employee_id_fkey'
        AND table_name = 'purchases'
    ) THEN
        ALTER TABLE public.purchases
        ADD CONSTRAINT purchases_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;
