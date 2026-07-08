-- Actualizar el plan a 'IA' para el superadmin (gamesexdy@gmail.com)
-- Para que tengas acceso a todo y no te bloqueen los triggers de la DB

UPDATE public.profiles 
SET plan = 'IA' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'gamesexdy@gmail.com'
);
