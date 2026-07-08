CREATE OR REPLACE FUNCTION create_employee(
    emp_email TEXT,
    emp_password TEXT,
    emp_username TEXT,
    emp_role TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    v_owner_id UUID;
BEGIN
    -- Validar que el usuario que ejecuta esto está autenticado
    v_owner_id := auth.uid();
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    new_user_id := gen_random_uuid();

    -- Insertar en auth.users (Supabase Auth)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, recovery_sent_at, last_sign_in_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', 
        new_user_id, 
        'authenticated', 
        'authenticated', 
        emp_email, 
        crypt(emp_password, gen_salt('bf')), 
        now(), now(), now(), 
        '{"provider":"email","providers":["email"]}', 
        jsonb_build_object('username', emp_username), 
        now(), now(), 
        '', '', '', ''
    );

    -- Insertar en auth.identities (Necesario para login con email en Supabase)
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 
        new_user_id, 
        format('{"sub":"%s","email":"%s"}', new_user_id::text, emp_email)::jsonb, 
        'email', 
        new_user_id::text, 
        now(), now(), now()
    );

    -- Crear el perfil público vinculado al owner (el que está ejecutando la función)
    INSERT INTO public.profiles (id, username, role, owner_id)
    VALUES (new_user_id, emp_username, emp_role, v_owner_id);

    RETURN new_user_id;
END;
$$;
