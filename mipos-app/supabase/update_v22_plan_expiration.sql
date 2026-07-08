-- Agregar columna para la fecha de vencimiento del plan
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;

-- Para los usuarios existentes que no tienen fecha, les asignamos 7 días de prueba desde la fecha en que se registraron
UPDATE public.profiles 
SET plan_expires_at = created_at + interval '7 days' 
WHERE plan_expires_at IS NULL;
