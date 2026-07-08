-- Función para obtener el email de un usuario a partir de su username en la tabla profiles.
-- Se ejecuta con SECURITY DEFINER para saltar el RLS de la tabla profiles.
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
BEGIN
    -- Buscar el id del usuario por su username
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE username = p_username;

    -- Si se encontró el id, buscar el email en auth.users
    IF FOUND THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE id = v_user_id;
        
        RETURN v_email;
    ELSE
        RETURN NULL;
    END IF;
END;
$$;
