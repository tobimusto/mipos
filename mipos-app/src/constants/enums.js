/**
 * Enumeraciones compartidas en toda la app.
 * Usar SIEMPRE estas constantes en lugar de strings literales.
 *
 * Beneficio: si un valor cambia, se actualiza en un solo lugar
 * y el compilador/linter detecta cualquier referencia rota.
 */

// ── Condiciones de IVA ───────────────────────────────────────
export const IVA_CONDITIONS = [
  'Consumidor Final',
  'Responsable Inscripto',
  'Monotributo',
  'Exento',
];

/** Valor por defecto para nuevos clientes / ventas */
export const DEFAULT_IVA = IVA_CONDITIONS[0];

// ── Métodos de pago ──────────────────────────────────────────
export const PAYMENT_METHODS = {
  EFECTIVO:      'efectivo',
  TARJETA:       'tarjeta',
  TRANSFERENCIA: 'transferencia',
  FIADO:         'fiado',
};

// ── Métodos de pago de compras ───────────────────────────────
export const PURCHASE_PAYMENT_METHODS = {
  CONTADO: 'contado',
  CREDITO: 'credito',
};

// ── Roles de usuario ─────────────────────────────────────────
export const ROLES = {
  PROPIETARIO:   'Propietario',
  GERENTE:       'Gerente',
  EMPLEADO_PLUS: 'Empleado PLUS',
  EMPLEADO:      'Empleado',
  CAJERO:        'Cajero',
  SUPERADMIN:    'Superadmin',
};

/** Roles con acceso completo (owner del negocio) */
export const OWNER_ROLES = [ROLES.PROPIETARIO, ROLES.SUPERADMIN];
