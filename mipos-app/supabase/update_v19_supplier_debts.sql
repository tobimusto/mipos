-- v19: Compras a Crédito — Deudas con Proveedores

-- 1. Agregar método de pago a compras
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'contado';

-- 2. Tabla de deudas con proveedores
CREATE TABLE IF NOT EXISTS supplier_debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  descripcion TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de cuotas
CREATE TABLE IF NOT EXISTS supplier_debt_installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID REFERENCES supplier_debts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  numero INTEGER NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha_vencimiento DATE,
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar RLS
ALTER TABLE supplier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_debt_installments ENABLE ROW LEVEL SECURITY;

-- 5. RLS usando check_tenant_access (ya definida en v8)
CREATE POLICY "Acceso a deudas del negocio" ON supplier_debts
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));

CREATE POLICY "Acceso a cuotas del negocio" ON supplier_debt_installments
FOR ALL USING (check_tenant_access(user_id)) WITH CHECK (check_tenant_access(user_id));
