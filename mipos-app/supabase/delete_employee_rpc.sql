CREATE OR REPLACE FUNCTION delete_employee(emp_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validar que el que ejecuta es el owner del empleado (o si es a si mismo, no permitirlo)
    IF emp_id = auth.uid() THEN
        RAISE EXCEPTION 'No podés borrarte a vos mismo.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = emp_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'No autorizado para borrar este empleado.';
    END IF;

    -- Intenta borrar el usuario de auth.users (en cascada borrará profile)
    DELETE FROM auth.users WHERE id = emp_id;
END;
$$;

-- Función auxiliar para cambiar contraseña (Desactivar forzadamente)
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
END;
$$;
