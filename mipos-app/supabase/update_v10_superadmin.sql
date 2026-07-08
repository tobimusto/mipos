-- update_v10_superadmin.sql
-- Concede permisos totales de SUPERADMIN al email del dueño (gamesexdy@gmail.com)

-- Función para agregar la política de superadmin dinámicamente a una tabla
CREATE OR REPLACE FUNCTION add_superadmin_policy(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('
        DROP POLICY IF EXISTS "Superadmin full access" ON public.%I;
        CREATE POLICY "Superadmin full access" ON public.%I
            FOR ALL
            USING ( (auth.jwt() ->> ''email'') = ''gamesexdy@gmail.com'' )
            WITH CHECK ( (auth.jwt() ->> ''email'') = ''gamesexdy@gmail.com'' );
    ', table_name, table_name);
EXCEPTION
    WHEN undefined_table THEN
        -- Ignorar si la tabla no existe
        RAISE NOTICE 'Tabla % no existe, ignorando.', table_name;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas importantes
SELECT add_superadmin_policy('products');
SELECT add_superadmin_policy('clients');
SELECT add_superadmin_policy('sales');
SELECT add_superadmin_policy('sale_items');
SELECT add_superadmin_policy('cash_movements');
SELECT add_superadmin_policy('cash_registers');
SELECT add_superadmin_policy('store_settings');
SELECT add_superadmin_policy('profiles');
SELECT add_superadmin_policy('providers');
SELECT add_superadmin_policy('purchases');
SELECT add_superadmin_policy('purchase_items');
SELECT add_superadmin_policy('employees');
SELECT add_superadmin_policy('shifts');
SELECT add_superadmin_policy('promotions');
SELECT add_superadmin_policy('categories');

DROP FUNCTION add_superadmin_policy(text);

-- Asegurar que el dueño tenga rol de Superadmin en perfiles (opcional pero bueno para la UI)
-- Alteramos el enum/check constraint si hace falta para permitir 'Superadmin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('Propietario', 'Gerente', 'Empleado PLUS', 'Empleado', 'Cajero', 'Superadmin'));

-- Si ya existe el perfil del dueño, lo actualizamos
UPDATE public.profiles SET role = 'Superadmin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'gamesexdy@gmail.com'
);
