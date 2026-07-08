-- Fase 4: Parche de Seguridad Crítico (Escalada de Privilegios y Desactivación)

-- 1. Agregar columna 'active' a profiles para manejar las desactivaciones de forma segura
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. Actualizar función de desactivar empleado
CREATE OR REPLACE FUNCTION deactivate_employee(emp_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = emp_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'No autorizado para desactivar este empleado.';
    END IF;

    -- Cambiar la contraseña a un hash aleatorio imposible de adivinar
    UPDATE auth.users 
    SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
    WHERE id = emp_id;

    -- Marcar el perfil como inactivo
    UPDATE public.profiles
    SET active = false
    WHERE id = emp_id;
END;
$$;

-- 3. Parchear Escalada de Privilegios en Perfiles
-- Borrar la política vieja que permitía auto-modificarse el perfil (lo que dejaba a un cajero hacerse gerente)
DROP POLICY IF EXISTS "Propietarios pueden actualizar sus empleados" ON public.profiles;

-- Crear política estricta: SÓLO EL DUEÑO DEL NEGOCIO (owner_id) puede modificar perfiles de ese negocio
CREATE POLICY "Dueños pueden actualizar perfiles de su negocio" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = owner_id);

-- OJO: Esto significa que los empleados no podrán cambiar su propio nombre o rol desde la UI, 
-- lo cual es el comportamiento correcto en un sistema POS seguro. El dueño administra todo.
