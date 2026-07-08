export default {
  code: 'UY',
  label: 'Uruguay',
  locale: 'es-UY',
  currency: { code: 'UYU', symbol: '$' },
  tax: {
    name: 'IVA',
    defaultRate: 22,
    conditions: ['Consumidor Final', 'Empresa', 'Monotributo', 'Exento'],
  },
  taxId: { label: 'RUT' },
  personId: { label: 'CI' },
  region: { label: 'Departamento', placeholder: 'Ej: Montevideo' },
  off: { domain: 'world.openfoodfacts.org' },
  businessTypes: ['Almacén', 'Farmacia', 'Ferretería', 'Indumentaria', 'Otro'],
};
