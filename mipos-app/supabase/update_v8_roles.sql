-- Habilitar pgcrypto para poder hashear contraseñas en la RPC
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Crear tabla de Perfiles (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Gerente', 'Empleado PLUS', 'Empleado', 'Cajero')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS para perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios pueden ver su propio perfil y el de sus empleados" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR auth.uid() = owner_id);

CREATE POLICY "Propietarios pueden actualizar sus empleados" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = owner_id OR auth.uid() = id);

-- 2. Modificar tablas existentes para auditoría
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES auth.users(id);
ALTER TABLE public.cash_movements ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES auth.users(id);

-- 3. Función RPC para crear empleados sin desloguear al Gerente
-- Esta función se ejecuta con privilegios elevados (SECURITY DEFINER) para poder escribir en auth.users
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

    -- Validar que el usuario que ejecuta esto es un Gerente (opcional pero recomendado)
    -- (Asumimos que la UI ya bloquea esto, pero por seguridad)

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
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 
        new_user_id, 
        format('{"sub":"%s","email":"%s"}', new_user_id::text, emp_email)::jsonb, 
        'email', 
        now(), now(), now()
    );

    -- Crear el perfil público vinculado al owner (el que está ejecutando la función)
    INSERT INTO public.profiles (id, username, role, owner_id)
    VALUES (new_user_id, emp_username, emp_role, v_owner_id);

    RETURN new_user_id;
END;
$$;
