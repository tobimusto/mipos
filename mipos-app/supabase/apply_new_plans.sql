-- 1. Cambiar el valor por defecto de la columna 'plan' para nuevos registros
-- Esto hará que los nuevos usuarios que hagan la prueba gratis obtengan el plan "esencial" (el plan del medio, antes llamado Pro)
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'esencial';

-- 2. Renombrar los planes de los usuarios existentes (usando temporales para no pisar datos)
-- Buscamos los nombres VIEJOS ('esencial', 'pro', 'ia') para pasarlos a los NUEVOS
UPDATE public.profiles SET plan = 'temp_basico' WHERE lower(plan) = 'esencial';
UPDATE public.profiles SET plan = 'temp_esencial' WHERE lower(plan) = 'pro';
UPDATE public.profiles SET plan = 'temp_pro' WHERE lower(plan) = 'ia';

UPDATE public.profiles SET plan = 'basico' WHERE plan = 'temp_basico';
UPDATE public.profiles SET plan = 'esencial' WHERE plan = 'temp_esencial';
UPDATE public.profiles SET plan = 'pro' WHERE plan = 'temp_pro';

-- 3. Actualizar la función de límites de productos para que use los nuevos nombres
CREATE OR REPLACE FUNCTION check_product_limit() RETURNS trigger AS $$
DECLARE
    v_plan TEXT;
    v_product_count INTEGER;
    v_limit INTEGER;
BEGIN
    SELECT lower(plan) INTO v_plan FROM public.profiles WHERE id = NEW.user_id;
    
    IF v_plan = 'basico' THEN
        v_limit := 100;
    ELSIF v_plan = 'esencial' THEN
        v_limit := 500;
    ELSE
        RETURN NEW;
    END IF;
    
    SELECT count(*) INTO v_product_count FROM public.products WHERE user_id = NEW.user_id;
    
    IF v_product_count >= v_limit THEN
        RAISE EXCEPTION 'Has alcanzado el límite de % productos para tu plan %.', v_limit, v_plan;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Actualizar la función de límites de empleados para que use los nuevos nombres
CREATE OR REPLACE FUNCTION check_employee_limit() RETURNS trigger AS $$
DECLARE
    v_plan TEXT;
    v_employee_count INTEGER;
    v_limit INTEGER;
BEGIN
    SELECT lower(plan) INTO v_plan FROM public.profiles WHERE id = NEW.owner_id;
    
    IF v_plan = 'basico' THEN
        v_limit := 1;
    ELSIF v_plan = 'esencial' THEN
        v_limit := 3;
    ELSE
        RETURN NEW;
    END IF;
    
    SELECT count(*) INTO v_employee_count FROM public.profiles WHERE owner_id = NEW.owner_id;
    
    IF v_employee_count >= v_limit THEN
        RAISE EXCEPTION 'Has alcanzado el límite de % empleados para tu plan %.', v_limit, v_plan;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
