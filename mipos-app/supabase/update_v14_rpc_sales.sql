-- update_v14_rpc_sales.sql

-- 1. RPC para procesar venta completa
CREATE OR REPLACE FUNCTION process_sale(
    p_user_id UUID,
    p_employee_id UUID,
    p_payment_method TEXT,
    p_total NUMERIC,
    p_cart_items JSONB, -- Array de { id: uuid, qty: numeric, price: numeric, name: text }
    p_client_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_current_stock NUMERIC;
    v_cash_balance NUMERIC;
    v_new_cash NUMERIC;
BEGIN
    INSERT INTO public.sales (user_id, employee_id, payment_method, total, client_id)
    VALUES (p_user_id, p_employee_id, lower(p_payment_method), p_total, p_client_id)
    RETURNING id INTO v_sale_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
    LOOP
        IF NOT ((v_item->>'id') LIKE 'custom-%') THEN
            
            UPDATE public.products 
            SET stock = stock - (v_item->>'qty')::NUMERIC 
            WHERE id = (v_item->>'id')::UUID AND user_id = p_user_id
            RETURNING stock INTO v_current_stock;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Producto no encontrado o no pertenece al usuario: %', v_item->>'name';
            END IF;

            INSERT INTO public.stock_movements (user_id, product_id, tipo, cantidad, motivo)
            VALUES (
                p_user_id, 
                (v_item->>'id')::UUID, 
                'salida', 
                (v_item->>'qty')::NUMERIC, 
                'Venta #' || split_part(v_sale_id::TEXT, '-', 1)
            );

            INSERT INTO public.sale_items (sale_id, product_id, qty, price, user_id)
            VALUES (
                v_sale_id, 
                (v_item->>'id')::UUID, 
                (v_item->>'qty')::NUMERIC, 
                (v_item->>'price')::NUMERIC, 
                p_user_id
            );
        END IF;
    END LOOP;

    IF lower(p_payment_method) = 'efectivo' THEN
        SELECT saldo_nuevo INTO v_cash_balance 
        FROM public.cash_movements 
        WHERE user_id = p_user_id 
        ORDER BY created_at DESC 
        LIMIT 1
        FOR UPDATE;

        IF v_cash_balance IS NULL THEN
            v_cash_balance := 0;
        END IF;

        v_new_cash := v_cash_balance + p_total;

        INSERT INTO public.cash_movements (user_id, employee_id, tipo, monto, motivo, saldo_anterior, saldo_nuevo)
        VALUES (
            p_user_id,
            p_employee_id,
            'ingreso',
            p_total,
            'Venta #' || split_part(v_sale_id::TEXT, '-', 1),
            v_cash_balance,
            v_new_cash
        );
    ELSE
        SELECT saldo_nuevo INTO v_cash_balance 
        FROM public.cash_movements 
        WHERE user_id = p_user_id 
        ORDER BY created_at DESC 
        LIMIT 1
        FOR UPDATE;

        IF v_cash_balance IS NULL THEN
            v_cash_balance := 0;
        END IF;

        INSERT INTO public.cash_movements (user_id, employee_id, tipo, monto, motivo, saldo_anterior, saldo_nuevo)
        VALUES (
            p_user_id,
            p_employee_id,
            'ingreso',
            p_total,
            'Venta digital (' || lower(p_payment_method) || ') #' || split_part(v_sale_id::TEXT, '-', 1),
            v_cash_balance,
            v_cash_balance
        );
    END IF;

    -- Si hay client_id, actualizar el balance del cliente si fue fiado u otro
    IF lower(p_payment_method) = 'fiado' AND p_client_id IS NOT NULL THEN
        UPDATE public.clients
        SET balance = COALESCE(balance, 0) + p_total
        WHERE id = p_client_id AND user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'new_cash_balance', COALESCE(v_new_cash, v_cash_balance));
END;
$$;

-- 2. RPC para anular venta
CREATE OR REPLACE FUNCTION cancel_sale(
    p_sale_id UUID,
    p_user_id UUID,
    p_employee_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
    v_cash_balance NUMERIC;
    v_new_cash NUMERIC;
BEGIN
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada.';
    END IF;

    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        UPDATE public.products 
        SET stock = stock + v_item.qty 
        WHERE id = v_item.product_id AND user_id = p_user_id;

        INSERT INTO public.stock_movements (user_id, product_id, tipo, cantidad, motivo)
        VALUES (
            p_user_id, 
            v_item.product_id, 
            'entrada', 
            v_item.qty, 
            'Anulación Venta #' || split_part(p_sale_id::TEXT, '-', 1)
        );
    END LOOP;

    IF lower(v_sale.payment_method) = 'efectivo' THEN
        SELECT saldo_nuevo INTO v_cash_balance 
        FROM public.cash_movements 
        WHERE user_id = p_user_id 
        ORDER BY created_at DESC 
        LIMIT 1
        FOR UPDATE;

        IF v_cash_balance IS NULL THEN
            v_cash_balance := 0;
        END IF;

        v_new_cash := GREATEST(0, v_cash_balance - v_sale.total);

        INSERT INTO public.cash_movements (user_id, employee_id, tipo, monto, motivo, saldo_anterior, saldo_nuevo)
        VALUES (
            p_user_id,
            p_employee_id,
            'egreso',
            v_sale.total,
            'Anulación Venta #' || split_part(p_sale_id::TEXT, '-', 1),
            v_cash_balance,
            v_new_cash
        );
    ELSE
        SELECT saldo_nuevo INTO v_cash_balance 
        FROM public.cash_movements 
        WHERE user_id = p_user_id 
        ORDER BY created_at DESC 
        LIMIT 1
        FOR UPDATE;

        IF v_cash_balance IS NULL THEN
            v_cash_balance := 0;
        END IF;

        INSERT INTO public.cash_movements (user_id, employee_id, tipo, monto, motivo, saldo_anterior, saldo_nuevo)
        VALUES (
            p_user_id,
            p_employee_id,
            'egreso',
            v_sale.total,
            'Anulación digital (' || lower(v_sale.payment_method) || ') #' || split_part(p_sale_id::TEXT, '-', 1),
            v_cash_balance,
            v_cash_balance
        );
    END IF;

    -- Revertir balance de cliente si fue fiado
    IF lower(v_sale.payment_method) = 'fiado' AND v_sale.client_id IS NOT NULL THEN
        UPDATE public.clients
        SET balance = GREATEST(0, COALESCE(balance, 0) - v_sale.total)
        WHERE id = v_sale.client_id AND user_id = p_user_id;
    END IF;

    DELETE FROM public.sale_items WHERE sale_id = p_sale_id;
    DELETE FROM public.sales WHERE id = p_sale_id;

    RETURN jsonb_build_object('success', true, 'new_cash_balance', COALESCE(v_new_cash, v_cash_balance));
END;
$$;
