-- update_v21_stock_validation.sql
-- Previene stock negativo a nivel de base de datos y en el RPC de ventas.

-- 1. Constraint CHECK como safety net definitivo en la tabla products
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_stock_non_negative;

ALTER TABLE public.products
ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);

-- 2. Actualizar process_sale para validar stock ANTES de descontar,
--    con mensaje claro al usuario cuando no hay stock suficiente.
CREATE OR REPLACE FUNCTION process_sale(
    p_user_id UUID,
    p_employee_id UUID,
    p_payment_method TEXT,
    p_total NUMERIC,
    p_cart_items JSONB,
    p_client_id UUID DEFAULT NULL,
    p_subtotal NUMERIC DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_surcharge_amount NUMERIC DEFAULT 0,
    p_discount_source TEXT DEFAULT NULL,
    p_discount_reason TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_current_stock NUMERIC;
    v_qty NUMERIC;
    v_product_name TEXT;
    v_cash_balance NUMERIC;
    v_new_cash NUMERIC;
BEGIN
    -- Validar stock de todos los items ANTES de registrar la venta.
    -- FOR UPDATE bloquea las filas para evitar race conditions.
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        IF NOT ((v_item->>'id') LIKE 'custom-%') THEN
            v_qty := (v_item->>'qty')::NUMERIC;
            v_product_name := v_item->>'name';

            SELECT stock INTO v_current_stock
            FROM public.products
            WHERE id = (v_item->>'id')::UUID AND user_id = p_user_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Producto no encontrado o no pertenece al usuario: %', v_product_name;
            END IF;

            IF v_current_stock - v_qty < 0 THEN
                RAISE EXCEPTION 'Stock insuficiente para "%". Stock disponible: %, cantidad requerida: %. Agregá stock o revisá el carrito.',
                    v_product_name,
                    v_current_stock,
                    v_qty;
            END IF;
        END IF;
    END LOOP;

    -- Registrar la venta (solo si todos los items tienen stock suficiente)
    INSERT INTO public.sales (
        user_id, employee_id, payment_method, total, client_id,
        subtotal, discount_amount, surcharge_amount, discount_source, discount_reason
    )
    VALUES (
        p_user_id, p_employee_id, lower(p_payment_method), p_total, p_client_id,
        COALESCE(p_subtotal, p_total), p_discount_amount, p_surcharge_amount, p_discount_source, p_discount_reason
    )
    RETURNING id INTO v_sale_id;

    -- Descontar stock y registrar movimientos
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        IF NOT ((v_item->>'id') LIKE 'custom-%') THEN
            v_qty := (v_item->>'qty')::NUMERIC;

            UPDATE public.products
            SET stock = stock - v_qty
            WHERE id = (v_item->>'id')::UUID AND user_id = p_user_id
            RETURNING stock INTO v_current_stock;

            INSERT INTO public.stock_movements (user_id, product_id, tipo, cantidad, motivo)
            VALUES (
                p_user_id,
                (v_item->>'id')::UUID,
                'salida',
                v_qty,
                'Venta #' || split_part(v_sale_id::TEXT, '-', 1)
            );

            INSERT INTO public.sale_items (sale_id, product_id, qty, price, user_id)
            VALUES (
                v_sale_id,
                (v_item->>'id')::UUID,
                v_qty,
                (v_item->>'price')::NUMERIC,
                p_user_id
            );
        END IF;
    END LOOP;

    -- Registrar movimiento de caja
    IF lower(p_payment_method) = 'efectivo' THEN
        SELECT saldo_nuevo INTO v_cash_balance
        FROM public.cash_movements
        WHERE user_id = p_user_id
        ORDER BY fecha DESC
        LIMIT 1
        FOR UPDATE;

        IF v_cash_balance IS NULL THEN v_cash_balance := 0; END IF;
        v_new_cash := v_cash_balance + p_total;

        INSERT INTO public.cash_movements (user_id, employee_id, tipo, monto, motivo, saldo_anterior, saldo_nuevo)
        VALUES (
            p_user_id, p_employee_id, 'ingreso', p_total,
            'Venta #' || split_part(v_sale_id::TEXT, '-', 1),
            v_cash_balance, v_new_cash
        );
    ELSE
        SELECT saldo_nuevo INTO v_cash_balance
        FROM public.cash_movements
        WHERE user_id = p_user_id
        ORDER BY fecha DESC
        LIMIT 1
        FOR UPDATE;

        IF v_cash_balance IS NULL THEN v_cash_balance := 0; END IF;

        INSERT INTO public.cash_movements (user_id, employee_id, tipo, monto, motivo, saldo_anterior, saldo_nuevo)
        VALUES (
            p_user_id, p_employee_id, 'ingreso', p_total,
            'Venta digital (' || lower(p_payment_method) || ') #' || split_part(v_sale_id::TEXT, '-', 1),
            v_cash_balance, v_cash_balance
        );
    END IF;

    IF lower(p_payment_method) = 'fiado' AND p_client_id IS NOT NULL THEN
        UPDATE public.clients
        SET deuda = COALESCE(deuda, 0) + p_total
        WHERE id = p_client_id AND user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'new_cash_balance', COALESCE(v_new_cash, v_cash_balance));
END;
$$;
