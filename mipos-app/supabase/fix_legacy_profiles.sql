-- 1. Eliminar la restricción actual de roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Volver a crear la restricción incluyendo 'Propietario'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('Propietario', 'Gerente', 'Empleado PLUS', 'Empleado', 'Cajero'));

-- 3. Insertar perfiles a los usuarios antiguos que se registraron antes de la v8
INSERT INTO public.profiles (id, username, role, owner_id)
SELECT 
    id, 
    -- Usa la parte del email antes del @ como username temporal
    split_part(email, '@', 1), 
    'Propietario', 
    id -- El owner_id de un propietario es su propio ID
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
