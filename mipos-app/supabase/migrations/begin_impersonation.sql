-- ============================================================
-- MIGRACIÓN: begin_impersonation
-- Ejecutar en: Supabase → SQL Editor
--
-- Propósito: valida server-side que solo Superadmins pueden
-- impersonar otros negocios. Usa auth.uid() del JWT (inforjeable).
-- ============================================================

CREATE OR REPLACE FUNCTION public.begin_impersonation(target_owner_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  TEXT;
  v_email TEXT;
BEGIN
  -- Rol del usuario autenticado leído desde la BD via JWT (no del cliente)
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Email del JWT para la cuenta de pruebas
  v_email := auth.jwt() ->> 'email';

  -- Solo Superadmins pueden impersonar
  IF v_role IS DISTINCT FROM 'Superadmin' AND v_email IS DISTINCT FROM 'gamesexdy@gmail.com' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: se requiere rol Superadmin para impersonar';
  END IF;

  -- El negocio destino debe existir
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_owner_id) THEN
    RAISE EXCEPTION 'NOT_FOUND: el negocio destino no existe (id: %)', target_owner_id;
  END IF;

  -- No impersonar tu propio usuario
  IF target_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'INVALID: no podés impersonar tu propio usuario';
  END IF;

  RETURN target_owner_id;
END;
$$;

-- Solo usuarios autenticados pueden llamar esta función
REVOKE ALL   ON FUNCTION public.begin_impersonation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_impersonation(UUID) TO authenticated;
