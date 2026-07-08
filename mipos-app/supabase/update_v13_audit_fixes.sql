-- update_v13_audit_fixes.sql
-- 1. Función segura para verificar si el usuario es Superadmin sin recursión infinita
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Función para actualizar las políticas de superadmin y remover el chequeo de email hardcodeado
CREATE OR REPLACE FUNCTION update_superadmin_policy(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('
        DROP POLICY IF EXISTS "Superadmin full access" ON public.%I;
        CREATE POLICY "Superadmin full access" ON public.%I
            FOR ALL
            USING ( public.is_superadmin() )
            WITH CHECK ( public.is_superadmin() );
    ', table_name, table_name);
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabla % no existe, ignorando.', table_name;
END;
$$ LANGUAGE plpgsql;

-- 3. Aplicar a todas las tablas importantes
SELECT update_superadmin_policy('products');
SELECT update_superadmin_policy('clients');
SELECT update_superadmin_policy('sales');
SELECT update_superadmin_policy('sale_items');
SELECT update_superadmin_policy('cash_movements');
SELECT update_superadmin_policy('cash_registers');
SELECT update_superadmin_policy('store_settings');
SELECT update_superadmin_policy('profiles');
SELECT update_superadmin_policy('providers');
SELECT update_superadmin_policy('purchases');
SELECT update_superadmin_policy('purchase_items');
SELECT update_superadmin_policy('employees');
SELECT update_superadmin_policy('shifts');
SELECT update_superadmin_policy('promotions');
SELECT update_superadmin_policy('categories');

DROP FUNCTION update_superadmin_policy(text);

-- 4. Limpieza de datos: normalizar métodos de pago
UPDATE public.sales SET payment_method = lower(payment_method);

-- 5. Nuevas columnas de configuración (márgenes y horarios)
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS estimated_margin NUMERIC DEFAULT 30,
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"opening": "08:00", "closing": "20:00"}'::jsonb;
