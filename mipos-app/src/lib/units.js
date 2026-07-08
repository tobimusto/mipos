/**
 * Definición centralizada de unidades de medida.
 * Usarlo en: POS, Purchases, Movements, NewProduct, Inventory.
 */

export const UNITS = [
  { value: 'unidades', label: 'Unidades',   abbr: 'u',  variable: false },
  { value: 'kg',       label: 'Kilogramos', abbr: 'kg', variable: true  },
  { value: 'gr',       label: 'Gramos',     abbr: 'gr', variable: true  },
  { value: 'litros',   label: 'Litros',     abbr: 'L',  variable: true  },
  { value: 'ml',       label: 'Mililitros', abbr: 'ml', variable: true  },
];

/** Valores cuya cantidad se ingresa manualmente (balanza / litros / etc.) */
export const VARIABLE_UNITS = UNITS.filter(u => u.variable).map(u => u.value);

/** Devuelve el objeto unidad por su value, o undefined si no existe */
export const getUnit = (value) => UNITS.find(u => u.value === value);

/** Devuelve la abreviatura: 'litros' → 'L', 'unidades' → 'u' */
export const unitAbbr = (value) => getUnit(value)?.abbr ?? value ?? '';

/** Formatea cantidad + unidad: (1.35, 'kg') → '1.35 kg' · (3, 'unidades') → '3 u' */
export const fmtQty = (qty, unit) => {
  if (qty == null) return '';
  const abbr = unitAbbr(unit);
  const num  = Number(qty);
  const str  = Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, '');
  return abbr ? `${str} ${abbr}` : str;
};
