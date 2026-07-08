-- update_v14_plan_limits.sql
-- Función para verificar límites de plan al insertar productos
CREATE OR REPLACE FUNCTION check_product_limit() RETURNS trigger AS $$
DECLARE
    v_plan TEXT;
    v_product_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Obtener el plan de la tienda
    SELECT plan INTO v_plan FROM public.profiles WHERE id = NEW.user_id;
    
    -- Determinar el límite basado en el plan
    IF v_plan = 'Esencial' THEN
        v_limit := 100;
    ELSIF v_plan = 'Pro' THEN
        v_limit := 500;
    ELSE
        -- IA u otros planes no tienen límite
        RETURN NEW;
    END IF;
    
    -- Contar productos actuales
    SELECT count(*) INTO v_product_count FROM public.products WHERE user_id = NEW.user_id;
    
    IF v_product_count >= v_limit THEN
        RAISE EXCEPTION 'Has alcanzado el límite de % productos para tu plan %.', v_limit, v_plan;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para productos
DROP TRIGGER IF EXISTS enforce_product_limit ON public.products;
CREATE TRIGGER enforce_product_limit
    BEFORE INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION check_product_limit();

-- Función para verificar límites de empleados
CREATE OR REPLACE FUNCTION check_employee_limit() RETURNS trigger AS $$
DECLARE
    v_plan TEXT;
    v_employee_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Determinar el owner (el que está invitando)
    -- Asumimos que los empleados se crean vinculados a un user_id (el dueño)
    SELECT plan INTO v_plan FROM public.profiles WHERE id = NEW.owner_id;
    
    -- Determinar límite
    IF v_plan = 'Esencial' THEN
        v_limit := 1;
    ELSIF v_plan = 'Pro' THEN
        v_limit := 3;
    ELSE
        RETURN NEW;
    END IF;
    
    -- Contar empleados actuales
    SELECT count(*) INTO v_employee_count FROM public.profiles WHERE owner_id = NEW.owner_id;
    
    IF v_employee_count >= v_limit THEN
        RAISE EXCEPTION 'Has alcanzado el límite de % empleados para tu plan %.', v_limit, v_plan;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para empleados
DROP TRIGGER IF EXISTS enforce_employee_limit ON public.profiles;
CREATE TRIGGER enforce_employee_limit
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_employee_limit();
