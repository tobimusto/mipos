-- Archivo para arreglar el RLS (Row Level Security) para los Empleados (Cajeros, Gerentes)
-- Hasta ahora, el RLS solo permitía acceso si auth.uid() == user_id (Propietario).
-- Con este script, permitimos el acceso si es el Propietario o si el empleado pertenece a ese Propietario.

-- 1. Crear una función auxiliar súper rápida y segura para verificar el acceso al tenant (negocio)
CREATE OR REPLACE FUNCTION check_tenant_access(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        -- Es el propietario
        target_user_id = auth.uid() 
        OR 
        -- O es un empleado de ese propietario
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND owner_id = target_user_id
        );
$$;

-- 2. Actualizar Productos
DROP POLICY IF EXISTS "Usuarios solo ven sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propios productos" ON public.products;

CREATE POLICY "Acceso a productos del negocio" ON public.products
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));

-- 3. Actualizar Ventas
DROP POLICY IF EXISTS "Usuarios solo ven sus propias ventas" ON public.sales;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias ventas" ON public.sales;
DROP POLICY IF EXISTS "Permitir borrar ventas" ON public.sales;

CREATE POLICY "Acceso a ventas del negocio" ON public.sales
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));

-- 4. Actualizar Items de Ventas
DROP POLICY IF EXISTS "Usuarios solo ven sus propios items" ON public.sale_items;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios items" ON public.sale_items;
DROP POLICY IF EXISTS "Permitir borrar sale items" ON public.sale_items;

CREATE POLICY "Acceso a sale_items del negocio" ON public.sale_items
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));

-- 5. Actualizar Clientes
DROP POLICY IF EXISTS "Usuarios solo ven sus propios clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus clientes" ON public.customers;

CREATE POLICY "Acceso a clientes del negocio" ON public.customers
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));

-- 6. Actualizar Proveedores
DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;

CREATE POLICY "Acceso a proveedores del negocio" ON public.providers
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));

-- 7. Actualizar Movimientos de Caja y Stock
DROP POLICY IF EXISTS "Acceso a cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Acceso a stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Acceso a cash_movements del negocio" ON public.cash_movements;
DROP POLICY IF EXISTS "Acceso a stock_movements del negocio" ON public.stock_movements;

CREATE POLICY "Acceso a cash_movements del negocio" ON public.cash_movements
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));

CREATE POLICY "Acceso a stock_movements del negocio" ON public.stock_movements
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));